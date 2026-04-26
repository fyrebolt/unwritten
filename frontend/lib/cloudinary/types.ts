export type DenialAsset = {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
};

type CloudinaryErrorBody = {
  error?: { message?: string };
};

export type CloudinaryRawUploadResponse = {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  created_at: string;
  width?: number;
  height?: number;
} & CloudinaryErrorBody;

export function mapUploadResponse(res: CloudinaryRawUploadResponse): DenialAsset {
  return {
    publicId: res.public_id,
    secureUrl: res.secure_url,
    resourceType: res.resource_type,
    format: res.format,
    bytes: res.bytes,
  };
}
