import { Cloudinary } from "@cloudinary/url-gen";

let _cld: Cloudinary | null = null;

export function getCloudNameOrNull(): string | null {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? null;
}

/**
 * Unsigned upload preset **name** (Settings → Upload → Upload presets).
 * Use the preset's name string — not the PID / internal id shown in the console.
 */
export function getUploadPresetOrNull(): string | null {
  return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? null;
}

/** Optional `folder` on upload; omit if your preset already fixes Asset folder. */
export function getUploadFolderOrNull(): string | null {
  const f = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER;
  if (f == null || f.trim() === "") return null;
  return f.trim();
}

export function isClientUploadConfigured(): boolean {
  return Boolean(getCloudNameOrNull() && getUploadPresetOrNull());
}

export function getCld(): Cloudinary {
  const cloudName = getCloudNameOrNull();
  if (!cloudName) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set.");
  }
  if (!_cld) {
    _cld = new Cloudinary({ cloud: { cloudName } });
  }
  return _cld;
}
