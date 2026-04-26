import "./load-env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import mongoose from "mongoose";
const { Types } = mongoose;
import { env } from "./env";
import { connectToDatabase } from "./db";
import { hashPassword, signAuthToken, verifyAuthToken, verifyPassword } from "./lib/auth";
import { User } from "./models/User";
import { Case } from "./models/Case";
import type { DenialExtracted } from "./extraction/types.js";
import { fetchCloudinaryAsset, hasCloudinaryCredentials } from "./denial/cloudinary-fetch.js";
import { extractFromImageBuffer, extractFromPdfBuffer } from "./denial/parse-handler.js";
import { transcribeIntakeRecording, intakeTranscribeAvailable } from "./intake/transcribe.js";
import { localWhisperEnabled } from "./intake/whisper-local.js";
import { geminiTranscribeAvailable } from "./intake/gemini-transcribe.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin(origin) {
      if (!origin) return "*";
      if (env.corsOrigins.includes(origin)) return origin;
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
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  }),
);

const openaiKey = () => process.env.OPENAI_API_KEY?.trim() || undefined;
const anthropicKey = () => process.env.ANTHROPIC_API_KEY?.trim() || undefined;
const geminiKey = () =>
  process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || undefined;

app.get("/", (c) =>
  c.json({
    name: "unwritten-api",
    status: "ok",
    note: "Denial parse: Anthropic → Gemini → OpenAI/heuristics. Voice: Web Speech + LOCAL_WHISPER (openai/whisper) and/or Whisper API; optional Claude polish.",
    cloudinaryHackathon:
      "https://cloudinary.com/pages/hackathons/ — client uploads to Cloudinary; this API parses the delivered asset URL.",
  }),
);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    ts: new Date().toISOString(),
    openai: Boolean(openaiKey()),
    gemini: Boolean(geminiKey()),
    anthropicConfigured: Boolean(anthropicKey()),
    intakeTranscribe:
      intakeTranscribeAvailable({
        openaiKey: openaiKey(),
        geminiKey: geminiKey(),
      }) || geminiTranscribeAvailable(),
    intakeWhisperOpenai: Boolean(openaiKey()),
    intakeWhisperLocal: localWhisperEnabled(),
    intakeGemini: geminiTranscribeAvailable(),
    intakeClaudePolish: Boolean(anthropicKey()),
    cloudinarySignedFetch: hasCloudinaryCredentials(),
  }),
);

// ─── auth helpers ────────────────────────────────────────────────────────────
// Legacy bcrypt/JWT auth. The Next.js frontend uses Clerk now and doesn't hit
// these endpoints; they're left in place for tooling and potential CLI usage.

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function getRequestUser(c: { req: { header: (name: string) => string | undefined } }): { userId: string; email: string } | null {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

function toPublicUser(user: {
  _id: unknown;
  email: string;
  name: string;
  medicalProfile: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    medicalProfile: user.medicalProfile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

app.post("/v1/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Member";

  if (!email || !password) {
    return c.json({ ok: false, error: "email-and-password-required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ ok: false, error: "password-too-short" }, 400);
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return c.json({ ok: false, error: "email-already-used" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name });
  const token = signAuthToken({ userId: String(user._id), email: user.email });

  return c.json({ ok: true, token, user: toPublicUser(user) }, 201);
});

app.post("/v1/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return c.json({ ok: false, error: "email-and-password-required" }, 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    return c.json({ ok: false, error: "invalid-credentials" }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({ ok: false, error: "invalid-credentials" }, 401);
  }

  const token = signAuthToken({ userId: String(user._id), email: user.email });
  return c.json({ ok: true, token, user: toPublicUser(user) });
});

app.get("/v1/me", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const user = await User.findById(authUser.userId);
  if (!user) return c.json({ ok: false, error: "user-not-found" }, 404);

  return c.json({ ok: true, user: toPublicUser(user) });
});

// ─── cases (legacy bcrypt-auth path) ────────────────────────────────────────
// Kept for backward compatibility; new frontend code uses Next API routes
// scoped by Clerk user id and writes to the same Mongo cluster directly.

app.post("/v1/cases", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const body = await c.req.json().catch(() => null);
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled case";
  const denial = typeof body?.denial === "object" && body.denial ? body.denial : {};
  const status = typeof body?.status === "string" ? body.status : "DRAFTING";

  const user = await User.findById(authUser.userId);
  if (!user) return c.json({ ok: false, error: "user-not-found" }, 404);

  const created = await Case.create({
    userId: new Types.ObjectId(authUser.userId),
    title,
    status,
    denial,
    historyContext: {
      diagnoses: user.medicalProfile.diagnoses,
      medications: user.medicalProfile.medications,
      allergies: user.medicalProfile.allergies,
      notes: user.medicalProfile.notes,
    },
    activity: [{ type: "CASE_CREATED", message: "Case created" }],
  });

  return c.json({ ok: true, case: created }, 201);
});

app.get("/v1/cases", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const cases = await Case.find({ userId: authUser.userId }).sort({ updatedAt: -1 });
  return c.json({ ok: true, cases });
});

app.get("/v1/cases/:id", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const caseDoc = await Case.findOne({ _id: id, userId: authUser.userId });
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  return c.json({ ok: true, case: caseDoc });
});

app.patch("/v1/cases/:id", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const patch: Record<string, unknown> = {};
  if (typeof body?.title === "string") patch.title = body.title.trim();
  if (typeof body?.status === "string") patch.status = body.status;
  if (typeof body?.denial === "object" && body.denial) patch.denial = body.denial;
  if (typeof body?.historyContext === "object" && body.historyContext) patch.historyContext = body.historyContext;

  const caseDoc = await Case.findOneAndUpdate(
    { _id: id, userId: authUser.userId },
    {
      $set: patch,
      $push: { activity: { type: "CASE_UPDATED", message: "Case updated" } },
    },
    { new: true },
  );
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  return c.json({ ok: true, case: caseDoc });
});

app.post("/v1/cases/:id/uploads", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey : "";
  if (!kind || !fileName || !mimeType || !storageKey) {
    return c.json({ ok: false, error: "invalid-upload-payload" }, 400);
  }

  const caseDoc = await Case.findOneAndUpdate(
    { _id: id, userId: authUser.userId },
    {
      $push: {
        uploads: { kind, fileName, mimeType, storageKey, uploadedAt: new Date() },
        activity: { type: "UPLOAD_ADDED", message: `Upload added: ${fileName}` },
      },
    },
    { new: true },
  );
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  return c.json({ ok: true, case: caseDoc });
});

app.post("/v1/cases/:id/transcript", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ ok: false, error: "transcript-text-required" }, 400);

  const transcript = {
    sourceFileKey: typeof body?.sourceFileKey === "string" ? body.sourceFileKey : undefined,
    confidence: typeof body?.confidence === "number" ? body.confidence : undefined,
    segments: Array.isArray(body?.segments) ? body.segments : [],
    text,
    createdAt: new Date(),
  };

  const caseDoc = await Case.findOneAndUpdate(
    { _id: id, userId: authUser.userId },
    {
      $set: { transcript },
      $push: { activity: { type: "TRANSCRIPT_SAVED", message: "Transcript saved" } },
    },
    { new: true },
  );
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  return c.json({ ok: true, case: caseDoc });
});

// ─── /v1/denial — parse a denial PDF/image (used by the frontend) ───────────

const denial = new Hono();

/** Parse a denial already uploaded to Cloudinary (secure_url). */
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
      meta = { ...r.meta, parseNote: `Unknown asset type (${rt || fmt || "?"}); tried PDF text.` };
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
    return c.json({ ok: false, error: 'Expected multipart field "file".' }, 400);
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

// ─── /v1/intake — voice transcription (used by the new-case wizard) ─────────

const intake = new Hono();
intake.post("/transcribe", async (c) => {
  const okey = openaiKey();
  const gkey = geminiKey();
  const akey = anthropicKey();

  if (!intakeTranscribeAvailable({ openaiKey: okey, geminiKey: gkey })) {
    return c.json(
      {
        ok: false,
        error: "No intake transcription backend is configured.",
        hint:
          "Easiest: set GEMINI_API_KEY (no install). Or LOCAL_WHISPER=1 with ffmpeg + pip install openai-whisper (https://github.com/openai/whisper). Or OPENAI_API_KEY for Whisper API. ANTHROPIC_API_KEY optionally polishes the text. You can also use Web Speech / typing in the browser.",
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
    return c.json({ ok: false, error: 'Expected multipart field "audio".' }, 400);
  }

  const buf = Buffer.from(await audio.arrayBuffer());
  const name = audio.name || "recording.webm";

  try {
    const text = await transcribeIntakeRecording(
      { openaiKey: okey, geminiKey: gkey, anthropicKey: akey },
      buf,
      name,
    );
    return c.json({ ok: true, text });
  } catch (e) {
    return c.json(
      { ok: false, error: e instanceof Error ? e.message : "Transcription failed." },
      502,
    );
  }
});

app.route("/v1/intake", intake);

// ─── appeal stubs (legacy) ──────────────────────────────────────────────────

app.post("/v1/cases/:id/appeal/generate", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const caseDoc = await Case.findOne({ _id: id, userId: authUser.userId });
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  const transcriptSnippet = caseDoc.transcript?.text
    ? caseDoc.transcript.text.slice(0, 400)
    : "No transcript provided yet.";
  const denialReason = caseDoc.denial.denialReason ?? "No denial reason captured.";
  const body = [
    `To whom it may concern,`,
    "",
    `I am writing to appeal the denial for ${caseDoc.denial.serviceDenied ?? "the requested treatment"}.`,
    `The denial reason listed was: ${denialReason}`,
    "",
    "Patient context:",
    transcriptSnippet,
    "",
    "I respectfully request reconsideration based on medical necessity and supporting documentation.",
  ].join("\n");

  caseDoc.appeal.drafts.push({ body, createdAt: new Date(), model: "template-v1" });
  caseDoc.status = "NEEDS_REVIEW";
  caseDoc.activity.push({
    type: "APPEAL_GENERATED",
    message: "Appeal draft generated",
    createdAt: new Date(),
  });
  await caseDoc.save();

  return c.json({ ok: true, draft: body, case: caseDoc });
});

app.post("/v1/cases/:id/appeal/send", async (c) => {
  const authUser = getRequestUser(c);
  if (!authUser) return c.json({ ok: false, error: "unauthorized" }, 401);

  const id = c.req.param("id");
  if (!Types.ObjectId.isValid(id)) {
    return c.json({ ok: false, error: "invalid-case-id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const finalVersion = typeof body?.finalVersion === "string" ? body.finalVersion.trim() : "";
  if (!finalVersion) return c.json({ ok: false, error: "final-version-required" }, 400);

  const caseDoc = await Case.findOne({ _id: id, userId: authUser.userId });
  if (!caseDoc) return c.json({ ok: false, error: "case-not-found" }, 404);

  caseDoc.appeal.finalVersion = finalVersion;
  caseDoc.appeal.sentAt = new Date();
  caseDoc.status = "AWAITING_FAX_CONFIRMATION";
  caseDoc.activity.push({
    type: "APPEAL_SENT",
    message: "Appeal marked as sent",
    createdAt: new Date(),
  });
  await caseDoc.save();

  return c.json({ ok: true, case: caseDoc });
});

const port = env.port;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[unwritten-api] listening on http://localhost:${info.port}`);
});

connectToDatabase()
  .then((didConnect) => {
    if (didConnect) console.log("[unwritten-api] connected to MongoDB");
    else
      console.log(
        "[unwritten-api] running without MongoDB (parse + intake endpoints only)",
      );
  })
  .catch((error) => {
    console.error(
      "[unwritten-api] failed to connect to MongoDB — continuing without it",
      error instanceof Error ? error.message : error,
    );
  });

export default app;
