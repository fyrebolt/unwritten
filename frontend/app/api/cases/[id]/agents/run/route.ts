/**
 * Loads a case, fetches the denial PDF from Cloudinary, and forwards everything
 * to the Python agents service. Persists the result on the case under
 * `appeal.draftLetter` plus structured findings, and returns the same payload
 * to the client. ~30s budget per call (Gemini drafting can be slow).
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCase, setAppealResults } from "@/lib/db/cases";
import { runAgents } from "@/lib/agents/run";
import { serializeCase } from "@/lib/db/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const caseDoc = await getCase(userId, params.id);
  if (!caseDoc) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const transcript = caseDoc.patientNarrative?.voiceTranscript;
  const facts = caseDoc.denialDocument?.extractedFacts;

  // Compose a text message from facts so the agents have context even when
  // the PDF parse failed or there's no Cloudinary URL.
  const factsLine = facts
    ? [
        facts.insurer && `Insurer: ${facts.insurer}`,
        facts.serviceDenied && `Service denied: ${facts.serviceDenied}`,
        facts.denialReasonText && `Denial reason: ${facts.denialReasonText}`,
        facts.memberId && `Member ID: ${facts.memberId}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const result = await runAgents({
    message: factsLine || undefined,
    voice: transcript || undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, rawResponse: result.rawResponse },
      { status: 502 },
    );
  }

  const updated = await setAppealResults(userId, params.id, {
    draftLetter: result.letter,
    policyFinding: result.policyFinding,
    evidenceFinding: result.evidenceFinding,
    caseFacts: result.caseFacts,
  });

  return NextResponse.json({
    ok: true,
    case: updated ? serializeCase(updated) : null,
    result: {
      letter: result.letter,
      policyFinding: result.policyFinding,
      evidenceFinding: result.evidenceFinding,
      caseFacts: result.caseFacts,
    },
  });
}
