import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCase, updateCase } from "@/lib/db/cases";
import { serializeCase } from "@/lib/db/serialize";
import { describeMongoError, isMongoUnreachableError } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function dbError(err: unknown) {
  const status = isMongoUnreachableError(err) ? 503 : 500;
  console.error("[api/cases/:id] db error:", err);
  return jsonError(status, describeMongoError(err));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonError(401, "unauthorized");
    const c = await getCase(userId, params.id);
    if (!c) return jsonError(404, "not-found");
    return NextResponse.json({ ok: true, case: serializeCase(c) });
  } catch (err) {
    return dbError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return jsonError(401, "unauthorized");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError(400, "invalid-body");
    const updated = await updateCase(userId, params.id, body);
    if (!updated) return jsonError(404, "not-found");
    return NextResponse.json({ ok: true, case: serializeCase(updated) });
  } catch (err) {
    return dbError(err);
  }
}
