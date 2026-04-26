type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string | null;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
};

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? "8787");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid PORT value");
  }
  return parsed;
}

function parseCorsOrigins(value: string | undefined): string[] {
  const fallback = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001";
  return (value ?? fallback)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// MONGO_URI / JWT_SECRET are only required by the legacy bcrypt-auth + case
// routes. The frontend uses Clerk and writes to Mongo via Next.js API routes
// directly, so the parse/intake endpoints can run without them. We log a
// warning but don't crash the process.
const mongoUri = process.env.MONGO_URI?.trim() || null;
if (!mongoUri) {
  console.warn(
    "[unwritten-api] MONGO_URI not set — legacy /v1/auth and /v1/cases routes are disabled. " +
      "Denial parse + intake transcription endpoints still work.",
  );
}

const jwtSecret = process.env.JWT_SECRET?.trim() || "dev-only-insecure-secret-change-me";

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  mongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};
