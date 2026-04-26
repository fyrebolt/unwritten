/**
 * Denial parsing runs against the Unwritten API after Cloudinary delivery
 * (Cloudinary hackathon track: https://cloudinary.com/pages/hackathons/).
 */
import { getApiBase } from "@/lib/api";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { DenialExtracted, ParseDenialResponse } from "./types";

async function readJson(res: Response, base: string): Promise<ParseDenialResponse> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = (await res.text()).slice(0, 160);
    throw new Error(
      `Parse API returned ${res.status} ${res.statusText} (non-JSON). ` +
        `Is the Hono backend running on ${base}? ` +
        `Start it with \`pnpm dev:backend\`. Body: ${text}`,
    );
  }
  return (await res.json()) as ParseDenialResponse;
}

export async function parseDenialFromUpload(opts: {
  file: File;
  asset?: DenialAsset;
}): Promise<{ extracted: DenialExtracted; parseNote?: string }> {
  const base = getApiBase();

  if (opts.asset?.secureUrl) {
    let res: Response;
    try {
      res = await fetch(`${base}/v1/denial/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secureUrl: opts.asset.secureUrl,
          publicId: opts.asset.publicId,
          resourceType: opts.asset.resourceType,
          format: opts.asset.format,
        }),
      });
    } catch (e) {
      throw new Error(
        `Could not reach the parse API at ${base}. Start the backend with \`pnpm dev:backend\`. ` +
          `(${e instanceof Error ? e.message : String(e)})`,
      );
    }

    let data: ParseDenialResponse | null = null;
    let firstError: string | undefined;
    try {
      data = await readJson(res, base);
      if (res.ok && data.ok && data.extracted) {
        return { extracted: data.extracted, parseNote: data.meta?.parseNote };
      }
      firstError = data.error;
    } catch (e) {
      firstError = e instanceof Error ? e.message : String(e);
    }

    // Server-side Cloudinary fetch needs a valid numeric API key; fall back to the local file.
    const fd = new FormData();
    fd.append("file", opts.file);
    const res2 = await fetch(`${base}/v1/denial/parse-file`, { method: "POST", body: fd });
    const data2 = await readJson(res2, base);
    if (!res2.ok || !data2.ok || !data2.extracted) {
      throw new Error(
        data2.error ?? firstError ?? `Parse failed (${res.status}). Is the API running on ${base}?`,
      );
    }
    return {
      extracted: data2.extracted,
      parseNote: data2.meta?.parseNote ?? "Parsed from local file (Cloudinary URL fetch skipped).",
    };
  }

  const fd = new FormData();
  fd.append("file", opts.file);
  let res: Response;
  try {
    res = await fetch(`${base}/v1/denial/parse-file`, { method: "POST", body: fd });
  } catch (e) {
    throw new Error(
      `Could not reach the parse API at ${base}. Start the backend with \`pnpm dev:backend\`. ` +
        `(${e instanceof Error ? e.message : String(e)})`,
    );
  }
  const data = await readJson(res, base);
  if (!res.ok || !data.ok || !data.extracted) {
    throw new Error(data.error ?? `Parse failed (${res.status}). Is the API running on ${base}?`);
  }
  return { extracted: data.extracted, parseNote: data.meta?.parseNote };
}
