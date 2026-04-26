import subprocess
import sys
import time
import os
from pathlib import Path
from dotenv import load_dotenv
import json
import requests

_AGENTS_DIR = Path(__file__).parent
_ROOT_DIR = _AGENTS_DIR.parent
_BACKEND_ENV = _ROOT_DIR / "backend" / ".env"
_ROOT_ENV = _ROOT_DIR / ".env"

# Load env from backend/.env first (team keeps keys there), then optional root .env.
if _BACKEND_ENV.exists():
    load_dotenv(_BACKEND_ENV)
if _ROOT_ENV.exists():
    load_dotenv(_ROOT_ENV, override=False)


def run_system():
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


def analyze_case(user_input: str = "", case_data: dict = None) -> dict:
    """Synchronous pipeline for the REST API — runs directly without uagents."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={api_key}"

    # Step 1: extract case facts from free text if no structured data provided
    if not case_data and user_input:
        prompt = (
            f"Extract insurer, medication, and denial_reason as JSON. "
            f"Ignore any social media handles or headers. "
            f"Input: {user_input}"
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(url, json=payload, timeout=10)
        result = resp.json()
        if "candidates" in result:
            raw = result["candidates"][0]["content"]["parts"][0]["text"]
            raw = raw.replace("```json", "").replace("```", "").strip()
            try:
                case_data = json.loads(raw)
            except json.JSONDecodeError:
                case_data = {"insurer": "Unknown", "medication": "Unknown", "denial_reason": "Unknown"}
        else:
            case_data = {"insurer": "Unknown", "medication": "Unknown", "denial_reason": "Unknown"}
    elif not case_data:
        case_data = {}

    # Step 2: policy lookup (mocked)
    policy_finding = (
        "Step therapy requirement is satisfied if documented intolerance to Metformin exists. "
        "(Anthem Clinical Policy Bulletin #MED.0001)"
    )

    # Step 3: evidence lookup (mocked)
    evidence_finding = (
        "GLP-1 receptor agonists are recommended when metformin is contraindicated. "
        "(ADA Standards of Care 2024)"
    )

    # Step 4: draft the letter
    draft_prompt = (
        f"Write a formal health insurance appeal letter in Markdown format. "
        f"Include headers for the address, a subject line, and a signature block.\n"
        f"Insurer: {case_data.get('insurer')}\n"
        f"Medication: {case_data.get('medication')}\n"
        f"Reason for Denial: {case_data.get('denial_reason')}\n"
        f"Legal Argument: {policy_finding}\n"
        f"Clinical Support: {evidence_finding}"
    )
    payload = {"contents": [{"parts": [{"text": draft_prompt}]}]}
    try:
        resp = requests.post(url, json=payload, timeout=(10, 90))
        result = resp.json()
        if "candidates" in result:
            letter = result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            letter = f"Gemini error: {result.get('error', {}).get('message', 'Unknown')}"
    except Exception as exc:
        letter = f"Request error: {exc}"

    return {
        "case_data": case_data,
        "policy_finding": policy_finding,
        "evidence_finding": evidence_finding,
        "letter": letter,
    }


if __name__ == "__main__":
    run_system()
