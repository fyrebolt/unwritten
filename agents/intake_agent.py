import io
import os
import json
import requests
import pypdf
from uagents import Agent, Context, Protocol, Model
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    TextContent,
    ChatAcknowledgement,
    EndSessionContent,
    chat_protocol_spec,
)
from dotenv import load_dotenv

load_dotenv()


class DraftRequest(Model):
    case_data: dict
    policy_finding: str
    evidence_finding: str
    api_key: str


class FinalLetter(Model):
    letter_body: str


class UniversalRequest(Model):
    data: dict


class ResearchRequest(Model):
    case_data: dict


class PolicyFindings(Model):
    loophole: str
    citation: str


class EvidenceFindings(Model):
    clinical_evidence: str
    citation: str


def extract_case_facts(user_input: str) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={api_key}"

    prompt = (
        f"Extract insurer, medication, and denial_reason into JSON. "
        f"Ignore any social media handles or headers. "
        f"Input: {user_input}"
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    response = requests.post(url, json=payload, timeout=10)
    result = response.json()

    if "candidates" not in result:
        return {"insurer": "Anthem", "medication": "Ozempic", "denial_reason": "Step Therapy"}

    raw_json = result["candidates"][0]["content"]["parts"][0]["text"]
    raw_json = raw_json.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_json)


def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception as exc:
        return f"[PDF extraction failed: {exc}]"


AGENTVERSE_API_KEY = os.environ.get("AGENTVERSE_API_KEY", "")

agent = Agent(
    name="IntakeAgent3",
    seed="ucla_intake_v3",
    port=8004,
    endpoint=["http://127.0.0.1:8004/submit"],
    agentverse=AGENTVERSE_API_KEY,
    mailbox=True,
)

POLICY_ADDR = "agent1q2qnclxx929zuean54py9utyl8sutnec97kyh43mrzrsstwderlhsnl7hnw"
EVIDENCE_ADDR = "agent1qvrav9d93ydghzjvgc09ew26v4rnwv2v57j054j98tpy9q90ajfrs5ec8st"
DRAFTER_ADDR = "agent1qg4nhgzk3d3m3jt9vmuu7l94s9eu37wz0utq5expcg6rc0dtn9vhyhacpdd"

chat_proto = Protocol(spec=chat_protocol_spec)


def _reset_state(ctx: Context):
    ctx.storage.set("case_facts", None)
    ctx.storage.set("policy_data", None)
    ctx.storage.set("evidence_data", None)
    ctx.storage.set("human_user", None)
    ctx.storage.set("drafter_sent", False)


@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    # Required by AgentChatProtocol:0.3.0 spec; we ignore acks of our own messages.
    pass


@chat_proto.on_message(model=ChatMessage)
async def start_orchestration(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info("Received message from ASI:One")

    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=msg.msg_id))

    raw_text = msg.content[0].text
    clean_text = raw_text.replace("@insurance-analyst", "").strip()

    _reset_state(ctx)
    ctx.storage.set("human_user", sender)

    try:
        case_data = extract_case_facts(clean_text)
        ctx.storage.set("case_facts", case_data)
        ctx.logger.info(f"Case parsed: {case_data}")

        await ctx.send(POLICY_ADDR, ResearchRequest(case_data=case_data))
        await ctx.send(EVIDENCE_ADDR, UniversalRequest(data=case_data))

        await ctx.send(sender, ChatMessage(content=[
            TextContent(type="text", text=f"Analyzing coverage for {case_data.get('medication', 'your treatment')}...")
        ]))
    except Exception as exc:
        ctx.logger.error(f"Intake error: {exc}")


@agent.on_message(model=PolicyFindings)
async def handle_policy(ctx: Context, sender: str, msg: PolicyFindings):
    ctx.storage.set("policy_data", f"{msg.loophole} (Source: {msg.citation})")
    await _check_if_ready(ctx)


@agent.on_message(model=EvidenceFindings)
async def handle_evidence(ctx: Context, sender: str, msg: EvidenceFindings):
    ctx.storage.set("evidence_data", f"{msg.clinical_evidence} (Source: {msg.citation})")
    await _check_if_ready(ctx)


async def _check_if_ready(ctx: Context):
    if ctx.storage.get("drafter_sent"):
        return

    p = ctx.storage.get("policy_data")
    e = ctx.storage.get("evidence_data")
    human = ctx.storage.get("human_user")
    case_data = ctx.storage.get("case_facts")

    if p and e and human and case_data:
        ctx.storage.set("drafter_sent", True)
        ctx.logger.info("All data gathered — sending to drafter")
        working_key = os.environ.get("GEMINI_API_KEY")
        await ctx.send(DRAFTER_ADDR, DraftRequest(
            case_data=case_data,
            policy_finding=p,
            evidence_finding=e,
            api_key=working_key,
        ))


@agent.on_message(model=FinalLetter)
async def handle_final_letter(ctx: Context, sender: str, msg: FinalLetter):
    human = ctx.storage.get("human_user")
    _reset_state(ctx)
    # Deliver the letter and end the chat session in a single envelope so the
    # caller (BridgeAgent / ASI:One) knows the orchestration is complete.
    await ctx.send(human, ChatMessage(content=[
        TextContent(
            type="text",
            text=f"**Your Custom Appeal Letter is Ready:**\n\n{msg.letter_body}",
        ),
        EndSessionContent(type="end-session"),
    ]))


agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
