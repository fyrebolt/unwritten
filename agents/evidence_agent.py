try:
    from .agent_workflow import find_medical_evidence as lookup_medical_evidence
except ImportError:
    from agent_workflow import find_medical_evidence as lookup_medical_evidence

try:
    from uagents import Agent, Context, Model
except ImportError:  # pragma: no cover - optional dependency
    Agent = Context = Model = None


if Model is not None:
    class UniversalRequest(Model):
        data: dict


    class EvidenceFindings(Model):
        clinical_evidence: str
        citation: str


    agent = Agent(name="EvidenceAgentV2", seed="ucla_evidence_v2")

    @agent.on_message(model=UniversalRequest)
    async def find_medical_evidence(ctx: Context, sender: str, msg: UniversalRequest):
        findings = lookup_medical_evidence(msg.data)
        ctx.logger.info(f"Received request for: {msg.data.get('medication')}")
        await ctx.send(sender, EvidenceFindings(**findings))
else:
    agent = None


if __name__ == "__main__":
    if agent is None:
        raise SystemExit("uagents is not installed. Install it before running evidence_agent.py.")
    agent.run()
