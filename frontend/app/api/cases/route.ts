import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCase, listCases } from "@/lib/db/cases";
import { ensureUser } from "@/lib/db/users";
import { serializeCase } from "@/lib/db/serialize";
import { describeMongoError, isMongoUnreachableError } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function dbError(err: unknown) {
  const status = isMongoUnreachableError(err) ? 503 : 500;
  console.error("[api/cases] db error:", err);
  return jsonError(status, describeMongoError(err));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return jsonError(401, "unauthorized");
    const cases = await listCases(userId);
    return NextResponse.json({ ok: true, cases: cases.map(serializeCase) });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonError(401, "unauthorized");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError(400, "invalid-body");
    }

    await ensureUser({ clerkUserId: userId });

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : composeFallbackTitle(body);

    const created = await createCase({
      clerkUserId: userId,
      title,
      status: "drafting",
      denialDocument: body.denialDocument,
      patientNarrative: body.patientNarrative,
    });

    return NextResponse.json(
      { ok: true, case: serializeCase(created) },
      { status: 201 },
    );
  } catch (err) {
    return dbError(err);
  }
}

function composeFallbackTitle(body: Record<string, unknown>): string {
  const denial = (
    body.denialDocument as
      | { extractedFacts?: { insurer?: string; serviceDenied?: string } }
      | undefined
  )?.extractedFacts;
  const insurer = denial?.insurer?.trim();
  const service = denial?.serviceDenied?.trim();
  if (insurer && service) return `${insurer} — ${service}`;
  if (insurer) return `${insurer} — appeal`;
  if (service) return `${service} appeal`;
  return "New appeal";
}
