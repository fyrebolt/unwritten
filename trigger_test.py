import asyncio
from dotenv import load_dotenv
from uagents.query import send_sync_message
from uagents_core.contrib.protocols.chat import ChatMessage, TextContent, ChatAcknowledgement

load_dotenv()

INTAKE_ADDR = "agent1q2qucmayj9wgvav3r9g9wd3kr4aw8l0k6amfztqws2d2qjlfxy4zurjtm4h"


async def trigger():
    print("Sending message to intake agent...")

    msg = ChatMessage(
        content=[TextContent(type="text", text="@insurance-analyst Anthem denied my Ozempic.")]
    )

    response = await send_sync_message(
        destination=INTAKE_ADDR,
        message=msg,
        response_type=ChatAcknowledgement,
        timeout=30,
    )

    if response:
        print(f"Acknowledged — msg_id: {getattr(response, 'acknowledged_msg_id', '?')}")
        print("Intake agent is processing. Watch its terminal for the full pipeline.")
    else:
        print("No response. Make sure the intake agent is running: python agents/intake_agent.py")


if __name__ == "__main__":
    asyncio.run(trigger())