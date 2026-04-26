"""
Bureau launcher — supports two topologies:

  REMOTE (default when keys are present):
    Only BridgeAgent runs locally. It dispatches `ChatMessage` to the live
    Agentverse-hosted IntakeAgent (REMOTE_INTAKE_ADDRESS), which orchestrates
    Policy/Evidence/Drafter on the public Fetch.ai network and returns the
    final letter ChatMessage back to BridgeAgent via Agentverse mailbox.
    This is the Fetch.ai-track-credible path: real cross-network agent
    traffic visible on agentverse.ai.

  LOCAL (fallback / offline / hackathon-safe demo):
    All five agents (intake/policy/evidence/drafter/bridge) run in a single
    in-process Bureau. Inter-agent messages route over the local Almanac.
    Same code path, same frontend contract — only difference is where the
    pipeline agents live.

Topology selection:
  - AGENTS_LOCAL_BUREAU=1                            forces LOCAL.
  - AGENTVERSE_API_KEY + REMOTE_INTAKE_ADDRESS set  -> REMOTE.
  - Otherwise                                        -> auto-falls back to LOCAL
                                                        (so dev still works
                                                        without an Agentverse
                                                        account).

Run:
    pnpm dev:bureau
  or:
    PYTHONPATH= ~/.unwritten-venv/bin/python -u -m agents.run_bureau

Env (loaded from backend/.env then root .env):
    GEMINI_API_KEY         required (intake classification + drafter, in LOCAL mode)
    AGENTVERSE_API_KEY     required for REMOTE mode (BridgeAgent registers a mailbox)
    REMOTE_INTAKE_ADDRESS  required for REMOTE mode (live IntakeAgent address)
    AGENTS_LOCAL_BUREAU    set to "1" to force LOCAL mode
    BUREAU_PORT            default 8200
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load env BEFORE importing the agent modules — they read keys at import time.
_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_ENV = _ROOT / "backend" / ".env"
_ROOT_ENV = _ROOT / ".env"
if _BACKEND_ENV.exists():
    load_dotenv(_BACKEND_ENV)
if _ROOT_ENV.exists():
    load_dotenv(_ROOT_ENV, override=False)


def _decide_topology() -> str:
    """Return "remote" or "local" based on env knobs.

    Two ways to enable REMOTE (talking to Agentverse-hosted pipeline):
      1. Pure-seed/Almanac path (recommended by Fetch.ai SWE):
            REMOTE_INTAKE_ADDRESS + BRIDGE_PUBLIC_URL
         (BRIDGE_PUBLIC_URL is the ngrok/public URL pointing at this bureau,
          registered on Almanac so the remote IntakeAgent's reply ChatMessage
          can POST back to us.)
      2. Mailbox path (legacy):
            REMOTE_INTAKE_ADDRESS + AGENTVERSE_API_KEY (and mailbox claimed
            via inspector UI). Not used by default any more.
    """
    if os.environ.get("AGENTS_LOCAL_BUREAU") == "1":
        return "local"
    if not os.environ.get("REMOTE_INTAKE_ADDRESS", "").strip():
        return "local"
    if (
        os.environ.get("BRIDGE_PUBLIC_URL", "").strip()
        or os.environ.get("AGENTVERSE_API_KEY", "").strip()
    ):
        return "remote"
    return "local"


def _import_bridge():
    """Import BridgeAgent (always needed)."""
    try:
        from agents.bridge_agent import bridge, INTAKE_ADDR_REGISTRY
    except ImportError:
        sys.path.insert(0, str(_ROOT))
        from agents.bridge_agent import bridge, INTAKE_ADDR_REGISTRY
    return bridge, INTAKE_ADDR_REGISTRY


def _import_pipeline_agents():
    """Import the four pipeline agents (only needed in LOCAL mode)."""
    try:
        from agents.intake_agent import agent as intake
        from agents.policy_agent import agent as policy
        from agents.evidence_agent import agent as evidence
        from agents.drafter_agent import agent as drafter
    except ImportError:
        sys.path.insert(0, str(_ROOT))
        from agents.intake_agent import agent as intake
        from agents.policy_agent import agent as policy
        from agents.evidence_agent import agent as evidence
        from agents.drafter_agent import agent as drafter
    return intake, policy, evidence, drafter


def _verify_local_address_alignment(policy, evidence, drafter) -> None:
    """In LOCAL mode IntakeAgent has hardcoded peer addresses derived from the
    other agents' seeds. If a teammate ever changes a seed without updating
    the constants, routing silently breaks. Catch that at startup."""
    from agents.intake_agent import POLICY_ADDR, EVIDENCE_ADDR, DRAFTER_ADDR

    mismatches: list[str] = []
    if policy.address != POLICY_ADDR:
        mismatches.append(f"  policy   expected={POLICY_ADDR}\n           actual={policy.address}")
    if evidence.address != EVIDENCE_ADDR:
        mismatches.append(f"  evidence expected={EVIDENCE_ADDR}\n           actual={evidence.address}")
    if drafter.address != DRAFTER_ADDR:
        mismatches.append(f"  drafter  expected={DRAFTER_ADDR}\n           actual={drafter.address}")

    if mismatches:
        print(
            "[bureau] WARNING — IntakeAgent peer addresses don't match the running agents.\n"
            "         Update the *_ADDR constants in agents/intake_agent.py:",
            file=sys.stderr,
        )
        for line in mismatches:
            print(line, file=sys.stderr)


def run() -> None:
    topology = _decide_topology()
    bridge, INTAKE_ADDR_REGISTRY = _import_bridge()

    bureau_port = int(os.environ.get("BUREAU_PORT", "8200"))
    # When BRIDGE_PUBLIC_URL is set (e.g. an ngrok URL), the bureau's *advertised*
    # endpoint becomes that public URL — that's what gets registered on Almanac
    # so remote agents can POST replies back. The bureau still binds locally on
    # bureau_port; the public URL is just the front door.
    public_url = os.environ.get("BRIDGE_PUBLIC_URL", "").strip()
    if public_url:
        bureau_endpoint = (
            public_url if public_url.endswith("/submit") else public_url.rstrip("/") + "/submit"
        )
    else:
        bureau_endpoint = f"http://127.0.0.1:{bureau_port}/submit"

    from uagents import Bureau

    bureau = Bureau(port=bureau_port, endpoint=[bureau_endpoint])

    if topology == "remote":
        remote_intake = os.environ["REMOTE_INTAKE_ADDRESS"].strip()
        INTAKE_ADDR_REGISTRY["value"] = remote_intake
        bureau.add(bridge)

        print(f"[bureau] mode=REMOTE — pipeline agents on Agentverse")
        print(f"[bureau] listening on {bureau_endpoint}")
        print(f"[bureau]   bridge        {bridge.address}")
        print(f"[bureau]   remote intake {remote_intake}")
    else:
        intake, policy, evidence, drafter = _import_pipeline_agents()
        _verify_local_address_alignment(policy, evidence, drafter)
        INTAKE_ADDR_REGISTRY["value"] = intake.address

        for ag in (intake, policy, evidence, drafter, bridge):
            bureau.add(ag)

        why_local = (
            "AGENTS_LOCAL_BUREAU=1"
            if os.environ.get("AGENTS_LOCAL_BUREAU") == "1"
            else "AGENTVERSE_API_KEY/REMOTE_INTAKE_ADDRESS not set"
        )
        print(f"[bureau] mode=LOCAL — all 5 agents in-process ({why_local})")
        print(f"[bureau] listening on {bureau_endpoint}")
        print(f"[bureau]   intake   {intake.address}")
        print(f"[bureau]   policy   {policy.address}")
        print(f"[bureau]   evidence {evidence.address}")
        print(f"[bureau]   drafter  {drafter.address}")
        print(f"[bureau]   bridge   {bridge.address}")

        if not os.environ.get("GEMINI_API_KEY"):
            print(
                "[bureau] WARNING: GEMINI_API_KEY is not set; "
                "intake parsing and drafter calls will fail.",
                file=sys.stderr,
            )

    bureau.run()


if __name__ == "__main__":
    run()
