import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";

type TokenPayload = {
  userId: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAuthToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAuthToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (!decoded || typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  const userId = decoded.userId;
  const email = decoded.email;
  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId, email };
}
