/**
 * App-side user record keyed on Clerk's user id (Clerk owns email/password —
 * we just keep app-specific data like agent config and medical profile).
 */
import type { Collection } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { UserDoc } from "./types";

async function usersColl(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  return db.collection<UserDoc>("users");
}

export async function ensureUser(input: {
  clerkUserId: string;
  email?: string;
  displayName?: string;
}): Promise<UserDoc> {
  const coll = await usersColl();
  const now = new Date();
  await coll.updateOne(
    { clerkUserId: input.clerkUserId },
    {
      $set: {
        email: input.email,
        displayName: input.displayName,
        updatedAt: now,
      },
      $setOnInsert: {
        clerkUserId: input.clerkUserId,
        createdAt: now,
      },
    },
    { upsert: true },
  );
  const found = await coll.findOne({ clerkUserId: input.clerkUserId });
  if (!found) throw new Error("Failed to upsert user record.");
  return found;
}

export async function getUser(clerkUserId: string): Promise<UserDoc | null> {
  const coll = await usersColl();
  return coll.findOne({ clerkUserId });
}
