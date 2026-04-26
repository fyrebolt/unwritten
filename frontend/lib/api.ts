/**
 * Browser: same-origin proxy `/__unwritten_api` (see `next.config.mjs` rewrites) avoids CORS when
 * the Next port is not 3000. Override with `NEXT_PUBLIC_API_URL` for a remote API.
 */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return "/__unwritten_api";
  return (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}
