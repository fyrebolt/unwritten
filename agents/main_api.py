import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

try:
    from .agent_workflow import analyze_case
except ImportError:
    from agent_workflow import analyze_case

class MainAPIHandler(BaseHTTPRequestHandler):
    server_version = "UnwrittenAgentsAPI/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self._send_json(
                200,
                {
                    "name": "unwritten-agents-main-api",
                    "status": "ok",
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

        # Build combined user_input from text sources.
        parts = []
        message = fields.get("message") or fields.get("input") or fields.get("user_input") or ""
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

        result = analyze_case(user_input=user_input, case_data=case_data)
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
    print(f"[agents.main_api] listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
