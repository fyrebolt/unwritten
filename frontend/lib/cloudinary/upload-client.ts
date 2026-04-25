import { getUploadFolderOrNull, isClientUploadConfigured } from "./config";
import {
  mapUploadResponse,
  type CloudinaryRawUploadResponse,
  type DenialAsset,
} from "./types";

function resourceKind(file: File): "raw" | "image" {
  if (file.type === "application/pdf") return "raw";
  if (file.type.startsWith("image/")) return "image";
  return "raw";
}

export function uploadUnsignedWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<DenialAsset> {
  if (!isClientUploadConfigured()) {
    return Promise.reject(new Error("Cloudinary client upload is not configured."));
  }
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  const kind = resourceKind(file);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  const folder = getUploadFolderOrNull();
  if (folder) form.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      let data: CloudinaryRawUploadResponse;
      try {
        data = JSON.parse(xhr.responseText) as CloudinaryRawUploadResponse;
      } catch {
        reject(new Error("Could not parse Cloudinary response."));
        return;
      }
      if (xhr.status >= 400 || data.error) {
        reject(new Error(data.error?.message || `Upload failed (${xhr.status}).`));
        return;
      }
      onProgress(100);
      resolve(mapUploadResponse(data));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}
