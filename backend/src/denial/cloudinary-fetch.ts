import { v2 as cloudinary } from "cloudinary";

/** True when server env has enough to build signed delivery URLs (no network call). */
export function hasCloudinaryCredentials(): boolean {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url?.startsWith("cloudinary://") && /^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)$/.test(url)) {
    return true;
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

let configured = false;

function configureOnce(): boolean {
  if (configured) return true;

  const url = process.env.CLOUDINARY_URL?.trim();
  if (url?.startsWith("cloudinary://")) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)$/.exec(url);
    if (m) {
      const [, apiKey, apiSecret, cloudName] = m;
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      configured = true;
      return true;
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
    return true;
  }

  return false;
}

/**
 * Download an asset from Cloudinary for server-side parsing.
 * Uses a signed delivery URL when API credentials are set (fixes 401 on private/raw delivery).
 * Otherwise uses the public `secure_url` from the upload response.
 */
export async function fetchCloudinaryAsset(opts: {
  secureUrl: string;
  publicId?: string;
  resourceType?: string;
}): Promise<Buffer> {
  const rtIn = (opts.resourceType ?? "raw").toLowerCase();
  const resourceType = rtIn === "image" ? "image" : "raw";

  if (opts.publicId && configureOnce()) {
    const signed = cloudinary.url(opts.publicId, {
      resource_type: resourceType,
      sign_url: true,
      secure: true,
    });
    const res = await fetch(signed);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    throw new Error(
      `Signed Cloudinary fetch failed (${res.status}). Check CLOUDINARY_* env matches the cloud used for uploads.`,
    );
  }

  const res = await fetch(opts.secureUrl, { redirect: "follow" });
  if (res.ok) return Buffer.from(await res.arrayBuffer());

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Could not fetch asset (401). Your Cloudinary account is not serving this file anonymously. " +
        "Fix: set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) on the API server " +
        "so we can use a signed URL — use the same cloud as NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.",
    );
  }

  throw new Error(`Could not fetch asset (${res.status}).`);
}
