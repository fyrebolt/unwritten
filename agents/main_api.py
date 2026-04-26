"""
HTTP bridge between the Next.js frontend and the uagents Bureau.

Architecture:
    frontend (Next.js)
        └─ POST /v1/intake (JSON)
            └─ this server (8788)
                ├─ primary path:   send_sync_message → BridgeAgent (Bureau on 8200)
                │                                      → IntakeAgent → Policy/Evidence/Drafter
                │                                      → BridgeAgent → AppealResponse(letter)
                └─ fallback path:  agent_workflow.analyze_case() (synchronous Gemini chain)

The fallback exists so the demo doesn't crash if the Bureau process is down or
times out. When the Bureau is running, every request goes through real uagents
message-passing — visible in the Bureau's logs as inter-agent traffic.

Env knobs:
    BUREAU_BRIDGE_ADDRESS  Bridge agent address (printed by run_bureau.py at
                           startup). Defaults to the deterministic address for
                           seed='ucla_bridge_v1'.
    AGENTS_BRIDGE_TIMEOUT  Seconds to wait for the Bureau to reply.
                           Default 150.
    AGENTS_DISABLE_BUREAU  Set to '1' to skip the Bureau path entirely (always
                           use the synchronous fallback). Useful for offline
                           testing.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

try:
    from .agent_workflow import analyze_case
except ImportError:
    from agent_workflow import analyze_case  # type: ignore

try:
    from .bridge_agent import AppealRequest, AppealResponse
except ImportError:
    from bridge_agent import AppealRequest, AppealResponse  # type: ignore


# Deterministic from the bridge's seed; verified at runtime against what the
# Bureau actually prints. If a teammate changes the bridge seed, override via
# BUREAU_BRIDGE_ADDRESS.
DEFAULT_BRIDGE_ADDRESS = (
    "agent1qf4qwzkz4xum2ngpl7cdg7mzwyffqwrmy3trr8qlfcc063cv6cj82864euu"
)
BRIDGE_ADDRESS = os.environ.get("BUREAU_BRIDGE_ADDRESS", DEFAULT_BRIDGE_ADDRESS)
BRIDGE_TIMEOUT = float(os.environ.get("AGENTS_BRIDGE_TIMEOUT", "60"))

# Bureau dispatch is the primary path in REMOTE topology, where the bridge
# routes through Almanac to the Agentverse-hosted IntakeAgent. Two ways the
# bridge can receive replies back:
#   - BRIDGE_PUBLIC_URL set (ngrok / public URL — pure seed/Almanac, no key)
#   - AGENTVERSE_API_KEY set (legacy mailbox path, requires UI claim)
# In LOCAL topology, send_sync_message has known routing issues delivering
# AppealResponse back to a non-agent caller in the same process, so we skip
# the bureau and use analyze_case directly. The Bureau still runs (5 agents
# register on Almanac, proving real uagents infra) but isn't on the request
# path until REMOTE config is in place.
_av_key = os.environ.get("AGENTVERSE_API_KEY", "").strip()
_remote_intake = os.environ.get("REMOTE_INTAKE_ADDRESS", "").strip()
_public_url = os.environ.get("BRIDGE_PUBLIC_URL", "").strip()
_force_disable = os.environ.get("AGENTS_DISABLE_BUREAU") == "1"
_force_enable = os.environ.get("AGENTS_FORCE_BUREAU") == "1"
_remote_ready = bool(_remote_intake) and bool(_public_url or _av_key)
BUREAU_DISABLED = _force_disable or (not _force_enable and not _remote_ready)


def _log(msg: str) -> None:
    print(f"[agents.main_api] {msg}", file=sys.stderr, flush=True)


async def _query_bridge(user_input: str) -> tuple[bool, str, str | None]:
    """Send the user's input to the BridgeAgent and await the appeal letter.

    Returns (ok, letter_or_error, transport_error). On any uagents/transport
    failure, ok is False and transport_error is set so the caller can fall
    back to analyze_case().
    """
    try:
        from uagents.query import send_sync_message
    except ImportError as exc:
        return False, "", f"uagents-not-installed: {exc}"

    try:
        response = await send_sync_message(
            destination=BRIDGE_ADDRESS,
            message=AppealRequest(user_input=user_input),
            response_type=AppealResponse,
            timeout=BRIDGE_TIMEOUT,
        )
    except Exception as exc:  # network / addressing / timeout
        return False, "", f"send_sync_message failed: {exc}"

    if response is None:
        return False, "", "no response from bridge (timeout or unreachable)"

    # AppealResponse is a uagents Model; if delivery failed send_sync_message
    # returns a MsgStatus instead, which doesn't have .error / .letter attrs.
    if not hasattr(response, "letter"):
        return False, "", f"bridge returned non-AppealResponse: {type(response).__name__}"

    if getattr(response, "error", None):
        return False, "", f"bridge error: {response.error}"

    return True, response.letter, None


def _run_pipeline(user_input: str, case_data: dict[str, Any] | None) -> dict[str, Any]:
    """Route the request through the Bureau (REMOTE topology) or run the
    synchronous chain directly (LOCAL topology). On bureau failure, falls
    back to the synchronous chain so requests never error out.
    """
    if not BUREAU_DISABLED and user_input.strip():
        try:
            ok, letter, err = asyncio.run(_query_bridge(user_input))
        except Exception as exc:
            ok, letter, err = False, "", f"asyncio.run failed: {exc}"

        if ok and letter.strip():
            _log(f"agentverse-bureau path used; letter length={len(letter)}")
            return {
                "letter": letter,
                "transport": "agentverse-bureau",
                "bridge": BRIDGE_ADDRESS,
            }

        _log(f"agentverse-bureau unavailable ({err}); falling back to local-chain")
        result = analyze_case(user_input=user_input, case_data=case_data)
        return {**result, "transport": "local-chain-fallback", "bureau_error": err}

    result = analyze_case(user_input=user_input, case_data=case_data)
    return {**result, "transport": "local-chain"}


class MainAPIHandler(BaseHTTPRequestHandler):
    server_version = "UnwrittenAgentsAPI/2.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self._send_json(
                200,
                {
                    "name": "unwritten-agents-main-api",
                    "status": "ok",
                    "transport": "local-chain" if BUREAU_DISABLED else "agentverse-bureau",
                    "bridge_address": BRIDGE_ADDRESS,
                    "routes": ["/health", "/v1/intake", "/v1/agents/analyze"],
                },
            )
            return
        if parsed.path == "/health":
            self._send_json(200, {"status": "ok"})
            return
        self._send_json(404, {"ok": False, "error": "not-found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path not in {"/v1/intake", "/v1/agents/analyze"}:
            self._send_json(404, {"ok": False, "error": "not-found"})
            return

        try:
            fields = self._read_json()
        except ValueError as exc:
            self._send_json(400, {"ok": False, "error": str(exc)})
            return

        parts: list[str] = []
        message = (
            fields.get("message")
            or fields.get("input")
            or fields.get("user_input")
            or ""
        )
        if message:
            parts.append(f"[User Message]\n{message}")
        voice = fields.get("voice") or fields.get("voice_transcription") or ""
        if voice:
            parts.append(f"[Voice Transcription]\n{voice}")

        user_input = "\n\n".join(parts)
        case_data = fields.get("case_data")
        if isinstance(case_data, str):
            try:
                case_data = json.loads(case_data)
            except json.JSONDecodeError:
                case_data = None

        if not user_input and not isinstance(case_data, dict):
            self._send_json(
                400,
                {
                    "ok": False,
                    "error": "Provide a PDF, message, voice transcription, or case_data.",
                },
            )
            return

        try:
            result = _run_pipeline(user_input=user_input, case_data=case_data)
        except Exception as exc:
            _log(f"pipeline error: {exc!r}")
            self._send_json(500, {"ok": False, "error": "pipeline-failure"})
            return

        self._send_json(200, {"ok": True, **result})

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _read_json(self) -> dict:
        length_header = self.headers.get("Content-Length")
        if not length_header:
            return {}
        try:
            content_length = int(length_header)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length header.") from exc

        raw_body = self.rfile.read(content_length).decode("utf-8")
        if not raw_body.strip():
            return {}

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ValueError("Request body must be valid JSON.") from exc

        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object.")
        return payload

    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)


def run() -> None:
    host = os.environ.get("AGENTS_API_HOST", "127.0.0.1")
    port = int(os.environ.get("AGENTS_API_PORT", "8788"))
    server = ThreadingHTTPServer((host, port), MainAPIHandler)
    _log(f"listening on http://{host}:{port}")
    if BUREAU_DISABLED:
        if _force_disable:
            why = "AGENTS_DISABLE_BUREAU=1"
        else:
            missing = []
            if not _remote_intake:
                missing.append("REMOTE_INTAKE_ADDRESS")
            if not (_public_url or _av_key):
                missing.append("BRIDGE_PUBLIC_URL or AGENTVERSE_API_KEY")
            why = f"missing {' + '.join(missing)} (LOCAL topology)"
        _log(f"bureau dispatch DISABLED — {why}; using analyze_case() directly")
    else:
        if _public_url:
            topology = f"REMOTE pure-seed (public={_public_url[:40]}...)"
        elif _av_key:
            topology = "REMOTE mailbox (Agentverse API key)"
        else:
            topology = "REMOTE (forced)"
        _log(f"bureau dispatch ENABLED — {topology}; bridge={BRIDGE_ADDRESS[:24]}...")
    server.serve_forever()


if __name__ == "__main__":
    run()
