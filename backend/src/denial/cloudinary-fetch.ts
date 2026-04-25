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
    const hasUrl = Boolean(process.env.CLOUDINARY_URL?.trim());
    const hasName = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim());
    const hasKey = Boolean(process.env.CLOUDINARY_API_KEY?.trim());
    const hasSecret = Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
    let hint =
      "Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET in backend/.env (same cloud as the browser). Restart the API after saving.";
    if (hasName && hasSecret && !hasKey && !hasUrl) {
      hint =
        "CLOUDINARY_API_KEY is missing in backend/.env — paste the numeric API Key from Cloudinary → Programmable Media → Dashboard (above the API Secret). Restart the API.";
    }
    if (!hasCloudinaryCredentials()) {
      hint += " Env is loaded from backend/.env on startup; if you just added vars, restart `npm run dev`.";
    }
    throw new Error(
      `Could not fetch asset (${res.status}). Anonymous delivery is blocked; signed fetch needs full Cloudinary credentials. ${hint}`,
    );
  }

  throw new Error(`Could not fetch asset (${res.status}).`);
}
