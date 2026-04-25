import type { DenialExtracted } from "../extraction/types.js";
import { emptyExtracted } from "../extraction/types.js";

/**
 * Lightweight field extraction from plain denial-letter text (no LLM).
 * Good baseline when OPENAI_API_KEY is not set.
 */
export function heuristicsFromDenialText(text: string): DenialExtracted {
  const out = emptyExtracted();
  if (!text.trim()) return out;

  const n = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  const insurers: [RegExp, string][] = [
    [/Anthem\s+Blue\s+Cross(?:\s+of\s+California)?/i, "Anthem Blue Cross"],
    [/United\s*Health\s*Care|UnitedHealthcare/i, "UnitedHealthcare"],
    [/Aetna\b/i, "Aetna"],
    [/Cigna\b/i, "Cigna"],
    [/Humana\b/i, "Humana"],
    [/Kaiser\s+Permanente/i, "Kaiser Permanente"],
    [/Blue\s+Cross\s+Blue\s+Shield/i, "Blue Cross Blue Shield"],
  ];
  for (const [re, name] of insurers) {
    if (re.test(n)) {
      out.insurer = name;
      break;
    }
  }

  const member =
    n.match(/(?:Member|Subscriber|Enrollee)(?:\s+ID|\s+Number|\s*#)?\s*[:\s#]*([A-Z0-9][A-Z0-9\-]{5,22})/i) ??
    n.match(/\b([A-Z]{2,4}\d{6,12})\b/);
  if (member?.[1]) out.memberId = member[1].trim();

  const plan = n.match(/\b(PPO|HMO|EPO|POS|HDHP)\b[^.\n]{0,50}/i);
  if (plan) out.planType = plan[0].replace(/\s+/g, " ").trim().slice(0, 80);

  const med = n.match(
    /(semaglutide|ozempic|wegovy|mounjaro|tirzepatide|zepbound|trulicity|jardiance)[^.]{0,120}/i,
  );
  if (med) out.serviceDenied = med[0].replace(/\s+/g, " ").trim().slice(0, 200);

  const reason =
    n.match(
      /(not\s+medically\s+necessary|experimental|investigational|step\s+therapy|prior\s+auth(?:orization)?\s+denied)[^.]{0,160}/i,
    ) ?? n.match(/(?:denied|deny|declined)[^.]{0,120}/i);
  if (reason) out.denialReason = reason[0].replace(/\s+/g, " ").trim().slice(0, 280);

  const deadline =
    n.match(
      /(?:appeal|must\s+file|submit).*?(?:by|before|no\s+later\s+than|within)\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ) ?? n.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  if (deadline?.[1]) out.appealDeadline = deadline[1].trim();

  if (!out.insurer) out.insurer = "Unknown insurer";
  return out;
}
