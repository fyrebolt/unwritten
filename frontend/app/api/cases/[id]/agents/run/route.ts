/**
 * Loads a case, gathers structured facts + the voice transcript, and forwards
 * everything to the Python agents service. Persists the result on the case
 * under `appeal.draftLetter` plus structured findings, and returns the same
 * payload to the client.
 *
 * Always returns valid JSON. All errors (auth, db, agents, persistence) are
 * caught and converted to user-safe `{ ok: false, error }` responses.
 *
 * ~30s budget per call (Gemini drafting can be slow, especially for the
 * draft stage on cold cache).
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getCase, setAppealResults } from "@/lib/db/cases";
import { runAgents } from "@/lib/agents/run";
import { serializeCase } from "@/lib/db/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(status: number, error: string, extras?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...(extras ?? {}) }, { status });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  // 1. Authenticate
  let userId: string | null = null;
  try {
    const a = await auth();
    userId = a.userId;
  } catch (err) {
    console.error("[agents/run] auth threw:", err);
    return jsonError(401, "Could not verify your session. Try signing in again.");
  }
  if (!userId) return jsonError(401, "unauthorized");

  // 2. Load case
  let caseDoc;
  try {
    caseDoc = await getCase(userId, params.id);
  } catch (err) {
    console.error("[agents/run] getCase threw:", err);
    return jsonError(500, "Could not load this case from the database.");
  }
  if (!caseDoc) return jsonError(404, "not-found");

  // 3. Compose context for agents — extracted facts + voice transcript.
  // Pull the Clerk profile so we can pre-fill the member name in the letter
  // instead of leaving an "[information on file]" placeholder. Failures are
  // non-fatal — the letter still renders without it.
  let memberName: string | undefined;
  try {
    const cu = await currentUser();
    memberName =
      cu?.fullName?.trim() ||
      [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim() ||
      cu?.username?.trim() ||
      undefined;
  } catch (err) {
    console.warn("[agents/run] currentUser failed, name will be omitted:", err);
  }
  const transcript = caseDoc.patientNarrative?.voiceTranscript;
  const facts = caseDoc.denialDocument?.extractedFacts;
  const cloudinaryMissing = !caseDoc.denialDocument?.cloudinaryUrl;

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

  console.log(
    "[agents/run] dispatch",
    JSON.stringify({
      caseId: params.id,
      hasFacts: Boolean(factsLine),
      hasTranscript: Boolean(transcript),
      cloudinaryMissing,
    }),
  );

  // 4. Call agents service. We send BOTH the flattened message (for the LLM
  // intake stage to read as narrative context) AND the structured facts as
  // case_data — the Python pipeline uses case_data to skip its intake-Gemini
  // re-parse, so the drafter gets real values like "Aetna" / "MRI knee" even
  // if Gemini is rate-limited or the narrative blob is sparse.
  let result;
  try {
    result = await runAgents({
      message: factsLine || undefined,
      voice: transcript || undefined,
      caseData: {
        insurer: facts?.insurer ?? null,
        service_denied: facts?.serviceDenied ?? null,
        denial_reason: facts?.denialReasonText ?? null,
        member_id: facts?.memberId ?? null,
        // Pre-known facts the LLM should NEVER placeholder-out.
        member_name: memberName ?? null,
        letter_date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
    });
  } catch (err) {
    console.error("[agents/run] runAgents threw:", err);
    return jsonError(
      502,
      "The agents service is unavailable. Confirm `python -m agents.main_api` is running on :8788.",
    );
  }

  if (!result.ok) {
    console.warn("[agents/run] agents returned error:", result.error);
    return jsonError(502, result.error, {
      // Pass rawResponse for the client's debug panel — it's already serializable.
      rawResponse: result.rawResponse,
    });
  }

  const pdfNote = cloudinaryMissing
    ? "Ran on extracted facts only — no PDF on file (Cloudinary not configured)."
    : undefined;

  // 5. Persist (best-effort — agents already produced the letter, so save
  // failure shouldn't block the user from seeing it).
  let serializedCase = null;
  try {
    const updated = await setAppealResults(userId, params.id, {
      draftLetter: result.letter,
      policyFinding: result.policyFinding,
      evidenceFinding: result.evidenceFinding,
      caseFacts: result.caseFacts,
    });
    serializedCase = updated ? serializeCase(updated) : null;
  } catch (err) {
    console.error("[agents/run] setAppealResults threw (returning result anyway):", err);
  }

  return NextResponse.json({
    ok: true,
    pdfNote,
    case: serializedCase,
    debug: result.debug,
    result: {
      letter: result.letter,
      policyFinding: result.policyFinding,
      evidenceFinding: result.evidenceFinding,
      caseFacts: result.caseFacts,
    },
  });
}
