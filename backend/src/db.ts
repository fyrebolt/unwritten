import mongoose from "mongoose";
import { env } from "./env";

let connected = false;

export async function connectToDatabase(): Promise<void> {
  if (connected) return;
  await mongoose.connect(env.mongoUri);
  connected = true;
}
