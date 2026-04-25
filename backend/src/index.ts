import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import type { DenialExtracted } from "./extraction/types.js";
import { fetchCloudinaryAsset, hasCloudinaryCredentials } from "./denial/cloudinary-fetch.js";
import { extractFromImageBuffer, extractFromPdfBuffer } from "./denial/parse-handler.js";
import { transcribeAudioBuffer } from "./intake/transcribe.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin(origin) {
      if (!origin) return "*";
      try {
        const u = new URL(origin);
        const host = u.hostname;
        const isLocal =
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "[::1]" ||
          host.endsWith(".localhost");
        if (isLocal && (u.protocol === "http:" || u.protocol === "https:")) {
          return origin;
        }
      } catch {
        /* ignore */
      }
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

const openaiKey = () => process.env.OPENAI_API_KEY?.trim() || undefined;

app.get("/", (c) =>
  c.json({
    name: "unwritten-api",
    status: "ok",
    note: "Denial parse + Whisper intake. Set OPENAI_API_KEY for best PDF/image + audio quality.",
    cloudinaryHackathon:
      "https://cloudinary.com/pages/hackathons/ — client uploads to Cloudinary; this API parses the delivered asset URL.",
  }),
);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    ts: new Date().toISOString(),
    openai: Boolean(openaiKey()),
    cloudinarySignedFetch: hasCloudinaryCredentials(),
  }),
);

/** Parse a denial already uploaded to Cloudinary (secure_url). */
const denial = new Hono();
denial.post("/parse", async (c) => {
  let body: { secureUrl?: string; publicId?: string; resourceType?: string; format?: string };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ ok: false, error: "Invalid JSON body." }, 400);
  }
  const url = body.secureUrl?.trim();
  if (!url) return c.json({ ok: false, error: "secureUrl is required." }, 400);

  try {
    const buf = await fetchCloudinaryAsset({
      secureUrl: url,
      publicId: body.publicId?.trim(),
      resourceType: body.resourceType,
    });
    const rt = (body.resourceType ?? "").toLowerCase();
    const fmt = (body.format ?? "").toLowerCase();

    const isImage = rt === "image" || /\.(jpe?g|png|webp)(\?|$)/i.test(url);
    const isPdf = rt === "raw" || fmt === "pdf" || /\.pdf(\?|$)/i.test(url);

    let extracted: DenialExtracted;
    let meta: { source: string; parseNote?: string };

    if (isImage) {
      const ct =
        fmt === "png"
          ? "image/png"
          : fmt === "webp"
            ? "image/webp"
            : "image/jpeg";
      const r = await extractFromImageBuffer(buf, ct, openaiKey());
      extracted = r.extracted;
      meta = r.meta;
    } else if (isPdf) {
      const r = await extractFromPdfBuffer(buf, openaiKey());
      extracted = r.extracted;
      meta = r.meta;
    } else {
      const r = await extractFromPdfBuffer(buf, openaiKey());
      extracted = r.extracted;
      meta = { ...r.meta, parseNote: `Unknown asset type (${rt || fmt || "?" }); tried PDF text.` };
    }

    return c.json({ ok: true, extracted, meta });
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : "Parse failed." },
      502,
    );
  }
});

/** Parse a denial PDF or image uploaded directly (no Cloudinary). */
denial.post("/parse-file", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, error: "Could not read multipart body." }, 400);
  }
  const file = body["file"];
  if (!(file instanceof File)) {
    return c.json({ ok: false, error: "Expected multipart field \"file\"." }, 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = file.type || "application/octet-stream";
  const name = file.name || "upload";

  try {
    if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      const r = await extractFromPdfBuffer(buf, openaiKey());
      return c.json({ ok: true, extracted: r.extracted, meta: r.meta });
    }
    if (type.startsWith("image/")) {
      const ct =
        type === "image/png"
          ? "image/png"
          : type === "image/webp"
            ? "image/webp"
            : "image/jpeg";
      const r = await extractFromImageBuffer(buf, ct, openaiKey());
      return c.json({ ok: true, extracted: r.extracted, meta: r.meta });
    }
    return c.json({ ok: false, error: `Unsupported type: ${type}` }, 415);
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : "Parse failed." },
      502,
    );
  }
});

app.route("/v1/denial", denial);

const intake = new Hono();
intake.post("/transcribe", async (c) => {
  const key = openaiKey();
  if (!key) {
    return c.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is not set on the API server.",
        hint: "Use browser speech recognition, or set the key for Whisper.",
      },
      501,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, error: "Could not read multipart body." }, 400);
  }
  const audio = body["audio"];
  if (!(audio instanceof File)) {
    return c.json({ ok: false, error: "Expected multipart field \"audio\"." }, 400);
  }

  const buf = Buffer.from(await audio.arrayBuffer());
  const name = audio.name || "recording.webm";

  try {
    const text = await transcribeAudioBuffer(key, buf, name);
    return c.json({ ok: true, text });
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : "Transcription failed." },
      502,
    );
  }
});

app.route("/v1/intake", intake);

const appeal = new Hono();
appeal.post("/generate", (c) =>
  c.json({ ok: false, reason: "not-implemented" }, 501),
);
app.route("/v1/appeal", appeal);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[unwritten-api] listening on http://localhost:${info.port}`);
});

export default app;
