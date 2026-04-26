import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCase, updateCase } from "@/lib/db/cases";
import { serializeCase } from "@/lib/db/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const c = await getCase(userId, params.id);
  if (!c) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, case: serializeCase(c) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
  }
  const updated = await updateCase(userId, params.id, body);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, case: serializeCase(updated) });
}
