/**
 * Case repository — all reads/writes for the `cases` collection live here so
 * API routes don't sprinkle Mongo queries everywhere. Every query filters on
 * clerkUserId so a logged-in user can never read another tenant's data.
 */
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { CaseDoc, CaseStatus } from "./types";

async function casesColl(): Promise<Collection<CaseDoc>> {
  const db = await getDb();
  return db.collection<CaseDoc>("cases");
}

export async function listCases(clerkUserId: string): Promise<CaseDoc[]> {
  const coll = await casesColl();
  return coll.find({ clerkUserId }).sort({ updatedAt: -1 }).toArray();
}

export async function getCase(
  clerkUserId: string,
  caseId: string,
): Promise<CaseDoc | null> {
  if (!ObjectId.isValid(caseId)) return null;
  const coll = await casesColl();
  return coll.findOne({ _id: new ObjectId(caseId), clerkUserId });
}

export async function createCase(input: {
  clerkUserId: string;
  title: string;
  status?: CaseStatus;
  denialDocument?: CaseDoc["denialDocument"];
  patientNarrative?: CaseDoc["patientNarrative"];
}): Promise<CaseDoc> {
  const now = new Date();
  const doc: CaseDoc = {
    clerkUserId: input.clerkUserId,
    title: input.title,
    status: input.status ?? "drafting",
    denialDocument: input.denialDocument,
    patientNarrative: input.patientNarrative,
    appeal: {},
    timeline: [{ event: "case_created", timestamp: now }],
    createdAt: now,
    updatedAt: now,
  };
  const coll = await casesColl();
  const res = await coll.insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function updateCase(
  clerkUserId: string,
  caseId: string,
  patch: Partial<Omit<CaseDoc, "_id" | "clerkUserId" | "createdAt">>,
): Promise<CaseDoc | null> {
  if (!ObjectId.isValid(caseId)) return null;
  const coll = await casesColl();
  const res = await coll.findOneAndUpdate(
    { _id: new ObjectId(caseId), clerkUserId },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return res ?? null;
}

export async function appendTimeline(
  clerkUserId: string,
  caseId: string,
  entry: { event: string; details?: Record<string, unknown> },
): Promise<void> {
  if (!ObjectId.isValid(caseId)) return;
  const coll = await casesColl();
  await coll.updateOne(
    { _id: new ObjectId(caseId), clerkUserId },
    {
      $push: { timeline: { ...entry, timestamp: new Date() } },
      $set: { updatedAt: new Date() },
    },
  );
}

export async function setAppealResults(
  clerkUserId: string,
  caseId: string,
  appeal: NonNullable<CaseDoc["appeal"]>,
): Promise<CaseDoc | null> {
  if (!ObjectId.isValid(caseId)) return null;
  const coll = await casesColl();
  const res = await coll.findOneAndUpdate(
    { _id: new ObjectId(caseId), clerkUserId },
    {
      $set: {
        appeal: { ...appeal, generatedAt: new Date() },
        status: "review" as CaseStatus,
        updatedAt: new Date(),
      },
      $push: { timeline: { event: "appeal_generated", timestamp: new Date() } },
    },
    { returnDocument: "after" },
  );
  return res ?? null;
}
