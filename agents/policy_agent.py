from uagents import Agent, Context, Model


class ResearchRequest(Model):
    case_data: dict


class PolicyFindings(Model):
    loophole: str
    citation: str


agent = Agent(name="PolicyAgent", seed="ucla_policy_v1", port=8001, endpoint=["http://127.0.0.1:8001/submit"])

@agent.on_message(model=ResearchRequest)
async def find_policy_loopholes(ctx: Context, sender: str, msg: ResearchRequest):
    ctx.logger.info(f"Checking policy for {msg.case_data.get('insurer')}")
   
    # LOGIC: Mocking a search in Anthem's Evidence of Coverage
    finding = "Step therapy requirement is satisfied if documented intolerance to Metformin exists."
    source = "Anthem Clinical Policy Bulletin #MED.0001"
   
    await ctx.send(sender, PolicyFindings(loophole=finding, citation=source))


if __name__ == "__main__":
    agent.run()



