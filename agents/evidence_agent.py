from uagents import Agent, Context, Model


# MUST match IntakeAgent exactly
class UniversalRequest(Model):
    data: dict


# MUST match IntakeAgent exactly
class EvidenceFindings(Model):
    clinical_evidence: str
    citation: str


# Use a consistent seed so your address doesn't change!
agent = Agent(name="EvidenceAgentV2", seed="ucla_evidence_v2", port=8002, endpoint=["http://127.0.0.1:8002/submit"])

@agent.on_message(model=UniversalRequest)
async def find_medical_evidence(ctx: Context, sender: str, msg: UniversalRequest):
    ctx.logger.info(f"Received request for: {msg.data.get('medication')}")
   
    # Mocked medical database lookup
    evidence = "GLP-1 receptor agonists are recommended when metformin is contraindicated."
    source = "ADA Standards of Care 2024"
   
    # Sending back to IntakeAgent
    await ctx.send(sender, EvidenceFindings(clinical_evidence=evidence, citation=source))


if __name__ == "__main__":
    agent.run()



