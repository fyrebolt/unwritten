"""
BridgeAgent — turns the async chat-protocol pipeline into a sync request/response
that the HTTP API (`agents/main_api.py`) can call via `uagents.query.send_sync_message`.

Why this exists:
    The IntakeAgent uses the ASI:One chat protocol. Receiving a `ChatMessage`,
    it acks immediately, dispatches Policy + Evidence in parallel, waits for
    both, dispatches the Drafter, then *much later* sends a final `ChatMessage`
    back to the original sender containing the appeal letter.

    `send_sync_message` only waits for ONE response. So the HTTP API can't just
    send a `ChatMessage` and wait for the letter — it would only get the ack.

    The bridge solves this by:
      1) Receiving an `AppealRequest(user_input)` from the HTTP API.
      2) Sending a `ChatMessage` to the IntakeAgent on the user's behalf.
         Because the bridge is the sender, the IntakeAgent stores the bridge's
         address in `human_user`, so the eventual final-letter `ChatMessage`
         comes back to the bridge.
      3) Awaiting an asyncio.Future tied to that request.
      4) When a `ChatMessage` arrives starting with the well-known
         "Your Custom Appeal Letter is Ready" marker (set by IntakeAgent's
         `handle_final_letter`), resolving the oldest pending future.
      5) Replying to the original HTTP-side caller with an `AppealResponse`.

    Interim "Analyzing..." chat messages from the IntakeAgent are filtered out
    so they don't prematurely resolve a request.

For demo purposes this is FIFO and assumes one in-flight request at a time
(judges/the user submit one case, wait, repeat). Concurrent requests would
need request-id correlation; not worth the complexity for the hackathon.
"""

from __future__ import annotations

import asyncio
import os
from typing import List, Optional

from uagents import Agent, Context, Model
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
)


# ─── Models exposed to main_api.py over the wire ────────────────────────────


class AppealRequest(Model):
    user_input: str


class AppealResponse(Model):
    letter: str
    error: Optional[str] = None


# ─── Bridge state ───────────────────────────────────────────────────────────

# Set by run_bureau.py at startup. In LOCAL mode this is the in-process
# IntakeAgent's address; in REMOTE mode it's the live Agentverse-hosted
# IntakeAgent address from REMOTE_INTAKE_ADDRESS env.
INTAKE_ADDR_REGISTRY: dict[str, str] = {"value": ""}

# FIFO queue of futures awaiting the IntakeAgent's final-letter ChatMessage.
_pending: List[asyncio.Future] = []

# Marker the IntakeAgent prepends to the final-letter ChatMessage.
# (See agents/intake_agent.py :: handle_final_letter.)
FINAL_LETTER_MARKER = "**Your Custom Appeal Letter is Ready:**"


def _build_bridge_agent() -> Agent:
    """Create the BridgeAgent — pure seed-based identity, no Agentverse
    account credentials needed.

    Identity comes from the seed phrase ("ucla_bridge_v1") which derives the
    address `agent1qf4qwzkz4xum2ngpl7...`. When this Agent is added to the
    Bureau in `run_bureau.py`, the Bureau's advertised endpoint (BRIDGE_PUBLIC_URL
    if set, else local) gets registered on Almanac, so peers like the
    Agentverse-hosted IntakeAgent can resolve our address and POST replies.

    No `agentverse=key` here: per Fetch.ai SWE guidance, agent-to-agent traffic
    only needs seed identity + a reachable endpoint; the API key is only for
    Agentverse-account features (mailbox, marketplace listing).
    """
    return Agent(
        name="BridgeAgent",
        seed="ucla_bridge_v1",
        port=8005,
        endpoint=["http://127.0.0.1:8005/submit"],
    )


bridge = _build_bridge_agent()


@bridge.on_message(model=AppealRequest, replies={AppealResponse})
async def handle_appeal_request(ctx: Context, sender: str, msg: AppealRequest) -> None:
    intake_addr = INTAKE_ADDR_REGISTRY.get("value", "")
    if not intake_addr:
        await ctx.send(
            sender,
            AppealResponse(letter="", error="bridge: IntakeAgent address not registered"),
        )
        return

    fut: asyncio.Future = asyncio.get_event_loop().create_future()
    _pending.append(fut)

    ctx.logger.info(
        f"[bridge] dispatch -> intake ({intake_addr[:20]}...), pending={len(_pending)}"
    )
    await ctx.send(
        intake_addr,
        ChatMessage(content=[TextContent(type="text", text=msg.user_input)]),
    )

    # Fail fast: if the remote pipeline can't deliver a final letter within ~50s
    # (well under the LLM chain's typical 25-30s plus generous buffer), we'd
    # rather hand back to main_api so it can run the local-chain fallback than
    # block the user for minutes. main_api uses a 60s envelope.
    bridge_wait = float(os.environ.get("BRIDGE_WAIT_SECONDS", "50"))
    try:
        letter = await asyncio.wait_for(fut, timeout=bridge_wait)
        await ctx.send(sender, AppealResponse(letter=letter))
    except asyncio.TimeoutError:
        ctx.logger.warning(f"[bridge] timeout waiting for final letter ({bridge_wait}s)")
        await ctx.send(
            sender,
            AppealResponse(
                letter="",
                error=f"bridge: pipeline timed out after {int(bridge_wait)}s",
            ),
        )
    finally:
        if fut in _pending:
            _pending.remove(fut)


@bridge.on_message(model=ChatMessage)
async def handle_inbound_chat(ctx: Context, sender: str, msg: ChatMessage) -> None:
    # ChatMessages can contain multiple content blocks (TextContent +
    # EndSessionContent). Concatenate every TextContent to find the final-letter
    # marker, regardless of where it lives in the content list.
    text_parts: list[str] = []
    has_end_session = False
    for c in msg.content or []:
        if isinstance(c, TextContent):
            text_parts.append(c.text)
        elif isinstance(c, EndSessionContent):
            has_end_session = True
    text = "\n".join(text_parts)

    # IntakeAgent sends interim "Analyzing coverage for ..." updates before
    # the final letter. Filter them out by looking for the well-known marker.
    if FINAL_LETTER_MARKER not in text:
        ctx.logger.info(
            f"[bridge] interim chat: {text[:80]!r} (end_session={has_end_session})"
        )
        return

    # Strip the marker so HTTP callers receive a clean letter body.
    letter_body = text.split(FINAL_LETTER_MARKER, 1)[1].lstrip("\n").lstrip()

    while _pending:
        fut = _pending.pop(0)
        if not fut.done():
            ctx.logger.info(
                f"[bridge] resolving pending request "
                f"({len(letter_body)} chars, end_session={has_end_session})"
            )
            fut.set_result(letter_body)
            return

    ctx.logger.warning("[bridge] received final letter but no pending request")


@bridge.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement) -> None:
    pass
