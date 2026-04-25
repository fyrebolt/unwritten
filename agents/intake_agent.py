import os
import uuid

try:
    from .agent_workflow import (
        analyze_case,
        build_final_report,
        extract_case_facts,
        sanitize_user_input,
    )
except ImportError:
    from agent_workflow import (
        analyze_case,
        build_final_report,
        extract_case_facts,
        sanitize_user_input,
    )

try:
    from uagents import Agent, Context, Protocol, Model
    from uagents_core.contrib.protocols.chat import (
        ChatAcknowledgement,
        ChatMessage,
        TextContent,
    )
except ImportError:  # pragma: no cover - optional dependency
    Agent = Context = Protocol = Model = None
    ChatAcknowledgement = ChatMessage = TextContent = None


if Model is not None:
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


    agent = Agent(name="IntakeAgent", seed="ucla_intake_v1")
    POLICY_ADDR = os.environ.get("POLICY_AGENT_ADDRESS", "")
    EVIDENCE_ADDR = os.environ.get("EVIDENCE_AGENT_ADDRESS", "")
    chat_proto = Protocol(name="ChatProtocol", version="1.0")

    @chat_proto.on_message(model=ChatMessage, replies={ChatAcknowledgement})
    async def start_orchestration(ctx: Context, sender: str, msg: ChatMessage):
        ctx.logger.info("Received intake request")

        msg_id = str(ctx.session) if ctx.session else str(uuid.uuid4())
        await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=msg_id))

        raw_text = msg.content[0].text if msg.content else ""
        clean_text = sanitize_user_input(raw_text)
        ctx.storage.set("human_user", sender)

        try:
            case_data = extract_case_facts(clean_text)
            ctx.logger.info(f"Parsed case: {case_data}")

            await ctx.send(
                sender,
                ChatMessage(
                    content=[
                        TextContent(
                            type="text",
                            text=f"Analyzing coverage for {case_data.get('medication', 'your treatment')}...",
                        )
                    ]
                ),
            )

            if POLICY_ADDR and EVIDENCE_ADDR:
                ctx.storage.set("case_data", case_data)
                await ctx.send(POLICY_ADDR, ResearchRequest(case_data=case_data))
                await ctx.send(EVIDENCE_ADDR, UniversalRequest(data=case_data))
            else:
                result = analyze_case(case_data=case_data)
                await ctx.send(
                    sender,
                    ChatMessage(
                        content=[TextContent(type="text", text=result["final_report"])]
                    ),
                )

        except Exception as exc:
            ctx.logger.error(f"Handler Error: {exc}")
            await ctx.send(
                sender,
                ChatMessage(
                    content=[
                        TextContent(
                            type="text",
                            text="I hit an internal processing error while analyzing that case.",
                        )
                    ]
                ),
            )


    @agent.on_message(model=PolicyFindings)
    async def handle_policy(ctx: Context, sender: str, msg: PolicyFindings):
        ctx.storage.set("policy_data", {"loophole": msg.loophole, "citation": msg.citation})
        await check_if_ready(ctx)


    @agent.on_message(model=EvidenceFindings)
    async def handle_evidence(ctx: Context, sender: str, msg: EvidenceFindings):
        ctx.storage.set(
            "evidence_data",
            {"clinical_evidence": msg.clinical_evidence, "citation": msg.citation},
        )
        await check_if_ready(ctx)


    async def check_if_ready(ctx: Context):
        policy = ctx.storage.get("policy_data")
        evidence = ctx.storage.get("evidence_data")
        human = ctx.storage.get("human_user")
        case_data = ctx.storage.get("case_data") or {}

        if policy and evidence and human:
            final_report = build_final_report(case_data, policy, evidence)

            await ctx.send(
                human,
                ChatMessage(content=[TextContent(type="text", text=final_report)]),
            )
            ctx.storage.set("policy_data", None)
            ctx.storage.set("evidence_data", None)
            ctx.storage.set("case_data", None)


    agent.include(chat_proto, publish_manifest=True)
else:
    agent = None


if __name__ == "__main__":
    if agent is None:
        raise SystemExit("uagents is not installed. Install it before running intake_agent.py.")
    agent.run()
