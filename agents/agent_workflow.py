"""
Insurance appeal agent pipeline (synchronous, REST-friendly).

Pipeline stages:
    1. INTAKE   — extract structured case_data from free text (Gemini)
    2. POLICY   — produce a case-type-specific policy finding (Gemini, grounded)
    3. EVIDENCE — produce a case-type-specific evidence finding (Gemini, grounded)
    4. DRAFT    — write the appeal letter using ONLY known facts (Gemini, grounded)

Every stage:
    - has a strict JSON contract enforced via _normalize_case_data / _parse_json_object
    - logs a one-line decision summary to stderr (visible in `pnpm dev` output)
    - falls back to a deterministic, fact-only template on Gemini failure
    - never echoes raw provider error messages to the client

The big bug we're fixing: previously this file injected static GLP-1 / Metformin
policy text into every appeal, including imaging/procedure denials. The new
pipeline classifies the denial first and refuses to surface medication policy
language unless the denial is medication-related.
"""

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv


_AGENTS_DIR = Path(__file__).parent
_ROOT_DIR = _AGENTS_DIR.parent
_BACKEND_ENV = _ROOT_DIR / "backend" / ".env"
_ROOT_ENV = _ROOT_DIR / ".env"

# Load env from backend/.env first (team keeps keys there), then optional root .env.
if _BACKEND_ENV.exists():
    load_dotenv(_BACKEND_ENV)
if _ROOT_ENV.exists():
    load_dotenv(_ROOT_ENV, override=False)


# --------------------------------------------------------------------------- #
# Logging helper — concise, prefixed, goes to stderr
# --------------------------------------------------------------------------- #

def _log(stage: str, msg: str) -> None:
    print(f"[agents] {stage:<8} {msg}", file=sys.stderr, flush=True)


# --------------------------------------------------------------------------- #
# Service classification — drives whether medication policy is appropriate
# --------------------------------------------------------------------------- #

ServiceCategory = str  # one of CATEGORIES below
CATEGORIES = (
    "medication",
    "imaging",
    "procedure",
    "surgery",
    "mental_health",
    "physical_therapy",
    "durable_medical_equipment",
    "fertility",
    "other",
)

_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "medication": (
        "drug", "rx", "prescription", "injection", "pill", "tablet", "infusion",
        "ozempic", "wegovy", "mounjaro", "humira", "dupixent", "metformin",
        "glp-1", "glp1", "biologic", "antibody", "spravato", "ketamine",
    ),
    "imaging": (
        "mri", "ct scan", " ct ", "cat scan", "ultrasound", "x-ray", "xray",
        "pet scan", "pet/ct", "imaging", "radiology", "mammogram", "echocardio",
        "ekg", "ecg",
    ),
    "surgery": (
        "surgery", "surgical", "operation", "fusion", "arthroplasty",
        "cochlear", "bariatric", "septoplasty", "implant",
    ),
    "mental_health": (
        "tms", "transcranial", "iop", "intensive outpatient", "psychiatric",
        "psychotherapy", "therapy session", "esketamine", "spravato",
        "behavioral", "aba", "applied behavior",
    ),
    "physical_therapy": (
        "physical therapy", " pt ", "rehab", "occupational therapy", "vestibular",
        "pelvic floor", "aquatic",
    ),
    "durable_medical_equipment": (
        "wheelchair", "cpap", "bipap", "oxygen concentrator", "hospital bed",
        "prosthesis", "orthotic", "cgm", "continuous glucose monitor", "dme",
    ),
    "fertility": (
        "ivf", "fertility", "egg retrieval", "icsi", "embryo", "iui", "letrozole",
    ),
    "procedure": (
        "biopsy", "endoscopy", "colonoscopy", "stress test", "ablation",
        "catheterization", "infusion therapy",
    ),
}


def _classify_service(service_text: str, denial_reason_text: str = "") -> ServiceCategory:
    blob = f"{service_text or ''} {denial_reason_text or ''}".lower()
    if not blob.strip():
        return "other"
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in blob:
                return cat
    return "other"


def _is_medication_denial(category: ServiceCategory) -> bool:
    return category == "medication"


# --------------------------------------------------------------------------- #
# Gemini client
# --------------------------------------------------------------------------- #

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_TIMEOUT_S = (10, 90)  # connect / read


def _gemini_endpoint() -> Optional[str]:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None
    return (
        f"https://generativelanguage.googleapis.com/v1/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )


def _call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini once. Returns text response, or None on any failure."""
    url = _gemini_endpoint()
    if not url:
        _log("gemini", "skipped — GEMINI_API_KEY missing")
        return None
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(url, json=payload, timeout=GEMINI_TIMEOUT_S)
    except requests.RequestException as exc:
        _log("gemini", f"request error: {exc!r}")
        return None
    try:
        data = resp.json()
    except ValueError:
        _log("gemini", f"non-JSON response (status {resp.status_code})")
        return None
    if "candidates" not in data:
        msg = (data.get("error") or {}).get("message", "unknown")
        _log("gemini", f"no candidates (error: {msg!r})")
        return None
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (IndexError, KeyError, TypeError):
        _log("gemini", "candidates missing content path")
        return None


def _parse_json_object(text: str) -> Optional[dict]:
    """Tolerant JSON extractor — strips ```json fences, finds the outermost {}."""
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        loaded = json.loads(cleaned)
        return loaded if isinstance(loaded, dict) else None
    except json.JSONDecodeError:
        pass
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first == -1 or last <= first:
        return None
    try:
        loaded = json.loads(cleaned[first : last + 1])
        return loaded if isinstance(loaded, dict) else None
    except json.JSONDecodeError:
        return None


# --------------------------------------------------------------------------- #
# Stage 1 — Intake
# --------------------------------------------------------------------------- #

_INTAKE_SYSTEM = """You extract structured facts from an insurance denial narrative.
Return ONLY a single JSON object, no prose, no fences. Use null for missing fields.

Schema:
{
  "insurer": string|null,
  "service_denied": string|null,
  "denial_reason": string|null,
  "patient_condition": string|null,
  "service_category": one of [
      "medication","imaging","procedure","surgery","mental_health",
      "physical_therapy","durable_medical_equipment","fertility","other"
  ]
}

Rules:
- Do NOT invent fields. If the input never mentions the insurer, return null.
- service_category MUST reflect service_denied. CT/MRI/X-ray => "imaging".
  Drug/Rx/medication => "medication". Surgery => "surgery". Etc.
- Ignore social handles, page headers/footers, signatures.
"""


def _normalize_case_data(case_data: dict) -> dict:
    insurer = case_data.get("insurer") or case_data.get("Insurer")
    service = (
        case_data.get("service_denied")
        or case_data.get("serviceDenied")
        or case_data.get("medication")  # legacy key
        or case_data.get("service")
    )
    reason = (
        case_data.get("denial_reason")
        or case_data.get("denialReason")
        or case_data.get("reason")
    )
    condition = (
        case_data.get("patient_condition")
        or case_data.get("condition")
        or case_data.get("diagnosis")
    )
    category = case_data.get("service_category") or case_data.get("category")
    if category not in CATEGORIES:
        category = _classify_service(service or "", reason or "")
    return {
        "insurer": (insurer or "").strip() or None,
        "service_denied": (service or "").strip() or None,
        "denial_reason": (reason or "").strip() or None,
        "patient_condition": (condition or "").strip() or None,
        "service_category": category,
    }


def _intake(user_input: str, case_data: Optional[dict]) -> dict:
    if isinstance(case_data, dict) and case_data:
        normalized = _normalize_case_data(case_data)
        _log(
            "intake",
            f"caller-provided case_data category={normalized['service_category']}",
        )
        return normalized
    if not user_input:
        return _normalize_case_data({})

    prompt = f"{_INTAKE_SYSTEM}\n\nINPUT:\n{user_input}"
    raw = _call_gemini(prompt)
    parsed = _parse_json_object(raw or "")
    if not parsed:
        normalized = _normalize_case_data({})
        _log("intake", "gemini failed; returning empty normalized case_data")
        return normalized
    normalized = _normalize_case_data(parsed)
    _log(
        "intake",
        f"insurer={normalized['insurer']!r} "
        f"service={normalized['service_denied']!r} "
        f"category={normalized['service_category']}",
    )
    return normalized


# --------------------------------------------------------------------------- #
# Stage 2 — Policy
# --------------------------------------------------------------------------- #

_POLICY_BASE_INSTRUCTIONS = """You write a SHORT (1-3 sentence) policy-coverage finding for a health
insurance appeal. Ground every claim in the case facts provided. Do NOT
mention any specific medication, drug class, or pharmacy benefit unless the
service_category is "medication". Do NOT cite a specific policy bulletin
number — speak generally about the plan's published medical policy.

Return ONLY a JSON object, no prose, no fences:
{
  "finding": string,
  "relevance_reason": string
}
"""


def _policy(case: dict) -> dict:
    service = case.get("service_denied") or "the requested service"
    reason = case.get("denial_reason") or "the stated denial reason"
    category = case.get("service_category", "other")
    insurer = case.get("insurer") or "the plan"

    prompt = (
        f"{_POLICY_BASE_INSTRUCTIONS}\n\nCASE FACTS:\n"
        f"insurer: {insurer}\n"
        f"service_denied: {service}\n"
        f"denial_reason: {reason}\n"
        f"service_category: {category}\n"
    )
    raw = _call_gemini(prompt)
    parsed = _parse_json_object(raw or "")
    if parsed and isinstance(parsed.get("finding"), str) and parsed["finding"].strip():
        finding = parsed["finding"].strip()
        relevance = (parsed.get("relevance_reason") or "").strip() or _default_relevance(case)
        if not _is_medication_denial(category):
            finding = _scrub_medication_terms(finding)
        _log("policy", f"category={category} chars={len(finding)}")
        return {"finding": finding, "relevance_reason": relevance, "fallback": False}

    fallback = _policy_fallback(case)
    _log("policy", f"fallback used (gemini failed) category={category}")
    return fallback


def _policy_fallback(case: dict) -> dict:
    insurer = case.get("insurer") or "Your plan"
    service = case.get("service_denied") or "the requested service"
    reason = case.get("denial_reason") or "the stated reason"
    finding = (
        f"{insurer}'s published medical policy lists coverage criteria for "
        f"{service}. The denial cites {reason}; the appeal should demonstrate "
        f"the criteria are met using the patient's documentation."
    )
    return {
        "finding": finding,
        "relevance_reason": _default_relevance(case),
        "fallback": True,
    }


def _default_relevance(case: dict) -> str:
    return (
        f"Speaks directly to the {case.get('service_category', 'requested')} "
        f"service named in this denial."
    )


_MEDICATION_TERMS = (
    "metformin", "glp-1", "glp1", "ozempic", "wegovy", "mounjaro", "trulicity",
    "humira", "step therapy", "formulary", "non-formulary", "drug class",
    "pharmacy benefit", "prescribing", "prior authorization for the drug",
)


def _scrub_medication_terms(text: str) -> str:
    """Last-resort sanitizer if a non-med stage leaks medication jargon."""
    out = text
    for term in _MEDICATION_TERMS:
        out = re.sub(rf"(?i)\b{re.escape(term)}\b", "[medication]", out)
    return out


# --------------------------------------------------------------------------- #
# Stage 3 — Evidence
# --------------------------------------------------------------------------- #

_EVIDENCE_BASE_INSTRUCTIONS = """You write a SHORT (1-3 sentence) clinical-evidence finding for a
health insurance appeal. Use ONLY information that follows from the
service_category and patient context. Do NOT cite specific peer-reviewed
papers (no fake DOIs / journal names) — reference standard-of-care guidance
generally (e.g. "professional society guidelines", "FDA labeling").

Do NOT mention medication-class evidence (GLP-1, biologics, step therapy,
etc.) unless service_category is "medication".

Return ONLY a JSON object, no prose, no fences:
{
  "finding": string,
  "relevance_reason": string
}
"""


def _evidence(case: dict) -> dict:
    service = case.get("service_denied") or "the requested service"
    condition = case.get("patient_condition") or "the patient's documented condition"
    category = case.get("service_category", "other")

    prompt = (
        f"{_EVIDENCE_BASE_INSTRUCTIONS}\n\nCASE FACTS:\n"
        f"service_denied: {service}\n"
        f"service_category: {category}\n"
        f"patient_condition: {condition}\n"
    )
    raw = _call_gemini(prompt)
    parsed = _parse_json_object(raw or "")
    if parsed and isinstance(parsed.get("finding"), str) and parsed["finding"].strip():
        finding = parsed["finding"].strip()
        if not _is_medication_denial(category):
            finding = _scrub_medication_terms(finding)
        relevance = (parsed.get("relevance_reason") or "").strip() or _default_relevance(case)
        _log("evidence", f"category={category} chars={len(finding)}")
        return {"finding": finding, "relevance_reason": relevance, "fallback": False}

    fallback = _evidence_fallback(case)
    _log("evidence", f"fallback used (gemini failed) category={category}")
    return fallback


def _evidence_fallback(case: dict) -> dict:
    service = case.get("service_denied") or "the requested service"
    condition = case.get("patient_condition") or "the patient's condition"
    finding = (
        f"Standard-of-care guidance from professional medical societies "
        f"supports {service} for patients presenting with {condition} "
        f"when conservative measures have not produced adequate response."
    )
    return {
        "finding": finding,
        "relevance_reason": _default_relevance(case),
        "fallback": True,
    }


# --------------------------------------------------------------------------- #
# Stage 4 — Drafter
# --------------------------------------------------------------------------- #

_DRAFTER_INSTRUCTIONS = """You are drafting a real insurance appeal letter for a real patient.

Follow these rules strictly:
- Use ONLY the facts provided. Do not invent claim numbers, member IDs,
  policy bulletin numbers, dates, or specific medication names not given.
- If a required fact is unknown, write "[information on file]" — do NOT
  write "[Your Name]", "[Date]", or generic placeholder text.
- Do not introduce medication policy language unless service_category is
  "medication".
- Keep it concise: ~250-400 words. Standard business-letter format.
- Sections: address block, date, RE line with insurer + service, salutation,
  1-2 paragraphs of argument tying the policy + evidence findings to the
  denial reason, request for overturn, signature.

Output ONLY the letter text — no markdown fences, no preamble.
"""


def _draft(case: dict, policy_finding: dict, evidence_finding: dict) -> dict:
    insurer = case.get("insurer") or "[insurer name]"
    service = case.get("service_denied") or "the requested service"
    reason = case.get("denial_reason") or "[denial reason]"
    condition = case.get("patient_condition") or "[patient condition]"
    category = case.get("service_category", "other")

    known_lines = [
        f"- insurer: {insurer}",
        f"- service_denied: {service}",
        f"- denial_reason: {reason}",
        f"- service_category: {category}",
        f"- patient_condition: {condition}",
        f"- policy_finding: {policy_finding.get('finding', '')}",
        f"- evidence_finding: {evidence_finding.get('finding', '')}",
    ]
    unknown_lines = []
    if case.get("insurer") is None:
        unknown_lines.append("- insurer name")
    if case.get("service_denied") is None:
        unknown_lines.append("- service denied")
    if case.get("denial_reason") is None:
        unknown_lines.append("- denial reason")
    if case.get("patient_condition") is None:
        unknown_lines.append("- patient condition")

    prompt = (
        f"{_DRAFTER_INSTRUCTIONS}\n\nKNOWN FACTS:\n" + "\n".join(known_lines) +
        ("\n\nUNKNOWN FACTS (use [information on file] in their place):\n"
         + "\n".join(unknown_lines) if unknown_lines else "")
        + "\n\nWrite the letter now."
    )
    text = _call_gemini(prompt)
    if text and text.strip():
        cleaned = text.strip()
        if not _is_medication_denial(category):
            cleaned = _scrub_medication_terms(cleaned)
        _log("draft", f"gemini ok chars={len(cleaned)}")
        return {"text": cleaned, "fallback": False}

    fallback_text = _draft_fallback(case, policy_finding, evidence_finding)
    _log("draft", f"fallback used chars={len(fallback_text)}")
    return {"text": fallback_text, "fallback": True}


def _draft_fallback(case: dict, policy_finding: dict, evidence_finding: dict) -> str:
    insurer = case.get("insurer") or "[insurer on file]"
    service = case.get("service_denied") or "the requested service"
    reason = case.get("denial_reason") or "the stated denial reason"
    condition = case.get("patient_condition") or "[patient condition on file]"
    today = time.strftime("%B %d, %Y")
    body = [
        "[Member name on file]",
        "[Member address on file]",
        "",
        today,
        "",
        f"{insurer}",
        "Member Appeals Department",
        "",
        f"RE: Appeal of denied claim — {service}",
        "",
        "To whom it may concern,",
        "",
        f"I am writing to appeal the denial of {service}. The denial cited "
        f"{reason}. I respectfully request that this determination be reversed.",
        "",
        f"For the patient's documented {condition}, "
        f"{policy_finding.get('finding', '').rstrip('.')}. "
        f"{evidence_finding.get('finding', '').rstrip('.')}.",
        "",
        "I have attached the supporting documentation that demonstrates the "
        "coverage criteria are met. Please reverse this determination and "
        "authorize the requested service.",
        "",
        "Sincerely,",
        "[Member name on file]",
    ]
    return "\n".join(body)


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #

def analyze_case(user_input: str = "", case_data: Optional[dict] = None) -> dict[str, Any]:
    """Run the four-stage pipeline. Always returns a dict — never raises.

    Returned shape:
        {
          "case_data": {insurer, service_denied, denial_reason,
                        patient_condition, service_category},
          "policy_finding":   string,
          "evidence_finding": string,
          "letter":           string,
          "debug": {
              "policy_relevance":    string,
              "evidence_relevance":  string,
              "stages_used_fallback": list[str],
              "service_category":    string
          }
        }
    """
    case = _intake(user_input, case_data)
    policy = _policy(case)
    evidence = _evidence(case)
    draft = _draft(case, policy, evidence)

    fallbacks: list[str] = []
    if policy.get("fallback"):
        fallbacks.append("policy")
    if evidence.get("fallback"):
        fallbacks.append("evidence")
    if draft.get("fallback"):
        fallbacks.append("draft")

    return {
        "case_data": case,
        "policy_finding": policy["finding"],
        "evidence_finding": evidence["finding"],
        "letter": draft["text"],
        "debug": {
            "policy_relevance": policy["relevance_reason"],
            "evidence_relevance": evidence["relevance_reason"],
            "stages_used_fallback": fallbacks,
            "service_category": case.get("service_category"),
        },
    }


# --------------------------------------------------------------------------- #
# Multi-process launcher (kept for parity with the original entry point)
# --------------------------------------------------------------------------- #

def run_system() -> None:
    agents = [
        "intake_agent.py",
        "policy_agent.py",
        "evidence_agent.py",
        "drafter_agent.py",
    ]

    processes = []
    print("Starting the Insurance Appeal Agent Network...")

    for agent_file in agents:
        path = str(_AGENTS_DIR / agent_file)
        p = subprocess.Popen([sys.executable, path])
        processes.append(p)
        print(f"Started {agent_file}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping agents...")
        for p in processes:
            p.terminate()


if __name__ == "__main__":
    run_system()
