import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_NAME = "llama-3.3-70b-versatile"
# fast alternative: "llama-3.1-8b-instant"


def summarize_mental_health(report_json: dict) -> str:
    """
    Convert structured 14-day mental health metrics into a supportive
    narrative summary. Non-diagnostic.
    """

    prompt = f"""
    You are a supportive wellbeing assistant.
    You are given structured 14-day emotional data in JSON form.

    Your goal:
    • Write a short 3–6 sentence natural language summary
    • Tone: calm, encouraging, supportive
    • Mention noticeable patterns (improving / declining / consistent)
    • Highlight positive signs + self-care tips
    • NO clinical diagnosis
    • NO medical claims

    Data:
    {report_json}

    Return plain text only.
    """

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        # ✅ message is an object, not a dict
        text = response.choices[0].message.content.strip()
        return text or "Unable to generate summary at this time."

    except Exception as e:
        print("Groq summary failed:", e)
        return "Unable to generate summary at this time."
