/**
 * Denial parsing runs against the Unwritten API after Cloudinary delivery
 * (Cloudinary hackathon track: https://cloudinary.com/pages/hackathons/).
 */
import { getApiBase } from "@/lib/api";
import type { DenialAsset } from "@/lib/cloudinary/types";
import type { DenialExtracted, ParseDenialResponse } from "./types";

export async function parseDenialFromUpload(opts: {
  file: File;
  asset?: DenialAsset;
}): Promise<{ extracted: DenialExtracted; parseNote?: string }> {
  const base = getApiBase();

  if (opts.asset?.secureUrl) {
    const res = await fetch(`${base}/v1/denial/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secureUrl: opts.asset.secureUrl,
        publicId: opts.asset.publicId,
        resourceType: opts.asset.resourceType,
        format: opts.asset.format,
      }),
    });
    const data = (await res.json()) as ParseDenialResponse;
    if (res.ok && data.ok && data.extracted) {
      return { extracted: data.extracted, parseNote: data.meta?.parseNote };
    }
    // Server-side Cloudinary fetch needs a valid numeric API key; fall back to the local file.
    const fd = new FormData();
    fd.append("file", opts.file);
    const res2 = await fetch(`${base}/v1/denial/parse-file`, {
      method: "POST",
      body: fd,
    });
    const data2 = (await res2.json()) as ParseDenialResponse;
    if (!res2.ok || !data2.ok || !data2.extracted) {
      throw new Error(
        data2.error ??
          data.error ??
          `Parse failed (${res.status}). Is the API running on ${base}?`,
      );
    }
    return {
      extracted: data2.extracted,
      parseNote: data2.meta?.parseNote ?? "Parsed from local file (Cloudinary URL fetch skipped).",
    };
  }

  const fd = new FormData();
  fd.append("file", opts.file);
  const res = await fetch(`${base}/v1/denial/parse-file`, {
    method: "POST",
    body: fd,
  });
  const data = (await res.json()) as ParseDenialResponse;
  if (!res.ok || !data.ok || !data.extracted) {
    throw new Error(data.error ?? `Parse failed (${res.status}). Is the API running on ${base}?`);
  }
  return { extracted: data.extracted, parseNote: data.meta?.parseNote };
}
