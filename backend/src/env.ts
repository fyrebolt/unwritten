type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
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
  const fallback = "http://localhost:3000,http://127.0.0.1:3000";
  return (value ?? fallback)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error("MONGO_URI is required");
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

export const env: AppEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  mongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};
