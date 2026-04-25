import json
import os
import re
from typing import Any

try:
    import requests
except ImportError:  # pragma: no cover - optional dependency
    requests = None


DEFAULT_CASE_DATA = {
    "insurer": "Anthem",
    "medication": "Ozempic",
    "denial_reason": "Step Therapy",
}


def sanitize_user_input(user_input: str) -> str:
    text = (user_input or "").strip()
    return text.replace("@insurance-analyst", "").strip()


def _extract_json_object(raw_text: str) -> dict[str, Any] | None:
    cleaned = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return None

    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def _heuristic_case_facts(user_input: str) -> dict[str, str]:
    text = sanitize_user_input(user_input)

    insurer = DEFAULT_CASE_DATA["insurer"]
    for candidate in [
        "Anthem",
        "Aetna",
        "Cigna",
        "Kaiser Permanente",
        "UnitedHealthcare",
        "Blue Cross Blue Shield",
    ]:
        if candidate.lower() in text.lower():
            insurer = candidate
            break

    medication = DEFAULT_CASE_DATA["medication"]
    med_match = re.search(
        r"\b(?:for|need|medication|drug|prescribed)\s+([A-Z][A-Za-z0-9\-]+)\b",
        text,
    )
    if med_match:
        medication = med_match.group(1)
    else:
        for candidate in ["Ozempic", "Wegovy", "Mounjaro", "Metformin"]:
            if candidate.lower() in text.lower():
                medication = candidate
                break

    denial_reason = DEFAULT_CASE_DATA["denial_reason"]
    for candidate in [
        "Step Therapy",
        "Medical Necessity",
        "Prior Authorization",
        "Experimental",
    ]:
        if candidate.lower() in text.lower():
            denial_reason = candidate
            break

    return {
        "insurer": insurer,
        "medication": medication,
        "denial_reason": denial_reason,
    }


def extract_case_facts(user_input: str) -> dict[str, str]:
    clean_text = sanitize_user_input(user_input)
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key or requests is None:
        return _heuristic_case_facts(clean_text)

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    prompt = (
        "Extract insurer, medication, and denial_reason into JSON. "
        "Ignore any social media handles or headers. "
        f"Input: {clean_text}"
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()
        candidates = result.get("candidates") or []
        if not candidates:
            return _heuristic_case_facts(clean_text)

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return _heuristic_case_facts(clean_text)

        raw_json = parts[0].get("text", "")
        parsed = _extract_json_object(raw_json)
        return _normalize_case_data(parsed or _heuristic_case_facts(clean_text))
    except Exception:
        return _heuristic_case_facts(clean_text)


def _normalize_case_data(case_data: dict[str, Any] | None) -> dict[str, str]:
    merged = dict(DEFAULT_CASE_DATA)
    if case_data:
        for key in DEFAULT_CASE_DATA:
            value = case_data.get(key)
            if value:
                merged[key] = str(value).strip()
    return merged


def find_policy_loopholes(case_data: dict[str, Any]) -> dict[str, str]:
    normalized = _normalize_case_data(case_data)
    reason = normalized["denial_reason"].lower()
    medication = normalized["medication"]

    if "step" in reason:
        finding = (
            f"Step therapy can be challenged when documented intolerance or failure "
            f"of first-line therapy exists before {medication}."
        )
        source = f"{normalized['insurer']} Clinical Policy Bulletin"
    elif "medical necessity" in reason:
        finding = (
            "Medical necessity denials can be rebutted with chart documentation, "
            "prior treatment history, and specialist rationale."
        )
        source = f"{normalized['insurer']} Coverage Determination Guidelines"
    else:
        finding = (
            "Denial language should be checked against plan criteria for missing "
            "exceptions, contraindications, and continuity-of-care provisions."
        )
        source = f"{normalized['insurer']} Evidence of Coverage"

    return {"loophole": finding, "citation": source}


def find_medical_evidence(case_data: dict[str, Any]) -> dict[str, str]:
    normalized = _normalize_case_data(case_data)
    medication = normalized["medication"]

    if medication.lower() in {"ozempic", "wegovy", "mounjaro"}:
        evidence = (
            f"Current diabetes and obesity guidelines support {medication} or related "
            "GLP-1 therapy when first-line treatment is contraindicated or ineffective."
        )
        source = "ADA Standards of Care 2024"
    else:
        evidence = (
            "Specialty-society guidelines and treating-clinician documentation can "
            "establish benefit when standard alternatives have failed."
        )
        source = "Treating specialist documentation and society guidance"

    return {"clinical_evidence": evidence, "citation": source}


def build_final_report(
    case_data: dict[str, Any],
    policy_data: dict[str, str],
    evidence_data: dict[str, str],
) -> str:
    normalized = _normalize_case_data(case_data)
    return (
        "**Appeal Strategy Ready**\n\n"
        f"**Case Summary:** {normalized['insurer']} denied {normalized['medication']} "
        f"for {normalized['denial_reason']}.\n\n"
        f"**Contractual Loophole:** {policy_data['loophole']} "
        f"(Source: {policy_data['citation']})\n\n"
        f"**Medical Evidence:** {evidence_data['clinical_evidence']} "
        f"(Source: {evidence_data['citation']})\n\n"
        "I am now drafting your final letter..."
    )


def analyze_case(
    user_input: str | None = None,
    case_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_case = _normalize_case_data(case_data or extract_case_facts(user_input or ""))
    policy = find_policy_loopholes(normalized_case)
    evidence = find_medical_evidence(normalized_case)
    return {
        "case_data": normalized_case,
        "policy": policy,
        "evidence": evidence,
        "final_report": build_final_report(normalized_case, policy, evidence),
    }
