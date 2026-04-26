import mongoose from "mongoose";
import { env } from "./env";

let connected = false;

export async function connectToDatabase(): Promise<boolean> {
  if (connected) return true;
  if (!env.mongoUri) return false;
  await mongoose.connect(env.mongoUri);
  connected = true;
  return true;
}
