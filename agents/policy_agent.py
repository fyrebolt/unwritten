try:
    from .agent_workflow import find_policy_loopholes as lookup_policy_findings
except ImportError:
    from agent_workflow import find_policy_loopholes as lookup_policy_findings

try:
    from uagents import Agent, Context, Model
except ImportError:  # pragma: no cover - optional dependency
    Agent = Context = Model = None


if Model is not None:
    class ResearchRequest(Model):
        case_data: dict


    class PolicyFindings(Model):
        loophole: str
        citation: str


    agent = Agent(name="PolicyAgent", seed="ucla_policy_v1")

    @agent.on_message(model=ResearchRequest)
    async def find_policy_loopholes(ctx: Context, sender: str, msg: ResearchRequest):
        findings = lookup_policy_findings(msg.case_data)
        ctx.logger.info(f"Checking policy for {msg.case_data.get('insurer')}")
        await ctx.send(sender, PolicyFindings(**findings))
else:
    agent = None


if __name__ == "__main__":
    if agent is None:
        raise SystemExit("uagents is not installed. Install it before running policy_agent.py.")
    agent.run()
