import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCase, listCases } from "@/lib/db/cases";
import { ensureUser } from "@/lib/db/users";
import { serializeCase } from "@/lib/db/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const cases = await listCases(userId);
  return NextResponse.json({ ok: true, cases: cases.map(serializeCase) });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
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

  return NextResponse.json({ ok: true, case: serializeCase(created) }, { status: 201 });
}

function composeFallbackTitle(body: Record<string, unknown>): string {
  const denial = (body.denialDocument as { extractedFacts?: { insurer?: string; serviceDenied?: string } } | undefined)
    ?.extractedFacts;
  const insurer = denial?.insurer?.trim();
  const service = denial?.serviceDenied?.trim();
  if (insurer && service) return `${insurer} — ${service}`;
  if (insurer) return `${insurer} — appeal`;
  if (service) return `${service} appeal`;
  return "New appeal";
}
