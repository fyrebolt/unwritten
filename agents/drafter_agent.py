from uagents import Agent, Context, Model
import os, requests


class DraftRequest(Model):
    case_data: dict
    policy_finding: str
    evidence_finding: str
    api_key: str


class FinalLetter(Model):
    letter_body: str




agent = Agent(name="Drafter", seed="ucla_drafter_v1", port=8003, endpoint=["http://127.0.0.1:8003/submit"])

@agent.on_message(model=DraftRequest)
async def compose_letter(ctx: Context, sender: str, msg: DraftRequest):
    ctx.logger.info("Drafting letter with Gemini 2.5...")
   
    api_key = msg.api_key
    # Use the 2026 stable production model
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={api_key}"
   
    prompt = (
        f"Write a formal health insurance appeal letter in Markdown format. "
        f"Include headers for the address, a subject line, and a signature block. "
        f"Insurer: {msg.case_data.get('insurer')}\n"
        f"Medication: {msg.case_data.get('medication')}\n"
        f"Reason for Denial: {msg.case_data.get('denial_reason')}\n"
        f"Legal Argument: {msg.policy_finding}\n"
        f"Clinical Support: {msg.evidence_finding}"
    )
   
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
   
    try:
        response = requests.post(url, json=payload, timeout=15)
        result = response.json()
       
        if "candidates" in result:
            final_text = result['candidates'][0]['content']['parts'][0]['text']
        else:
            error_details = result.get("error", {}).get("message", "Unknown Model Error")
            final_text = f"Gemini API Error: {error_details}"
           
    except Exception as e:
        final_text = f"System Error: {str(e)}"


    await ctx.send(sender, FinalLetter(letter_body=final_text))
   
if __name__ == "__main__":
    agent.run()

