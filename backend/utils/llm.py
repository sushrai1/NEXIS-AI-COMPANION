import os, json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_NAME = "llama-3.3-70b-versatile"  # or "llama-3.1-8b-instant"

SCHEMA_HINT = """
Return ONLY valid minified JSON with these keys:

{
  "summary": "string (2-3 sentences, warm and conversational)",
  "mood_direction": "improving|declining|fluctuating|stable",
  "key_insights": ["string", "string", "string"],
  "suggestions": ["string", "string", "string", "string"],
  "strengths": ["string", "string"],
  "possible_triggers": ["string", "string", "string"],
  "recommend_followup": true|false
}
"""

def generate_structured_insights(report_json: dict) -> dict:
    """
    Returns a structured dict for UI sections.
    """
    prompt = f"""
You are Nexis, a supportive wellbeing assistant.

INPUT DATA (14-day aggregation + PHQ):
{json.dumps(report_json, ensure_ascii=False, default=str)}

TASK:
Create supportive, actionable insights with a gentle, warm tone.
- Keep it supportive, non-diagnostic.
- Avoid medical claims.
- Suggestions should be practical and small (breathing, short walk, journaling, reaching out, hydration, routine).
- Consider risk_score, neg_ratio, trend_slope, and PHQ-9 (if present).
- If risk is high or PHQ-9 is elevated, set recommend_followup=true with gentle wording.

{SCHEMA_HINT}
"""

    try:
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.6,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()

        # robust JSON parse (strip code fences if any)
        if text.startswith("```"):
            text = text.strip("`")
            # remove possible language tag like json
            if text.startswith("json"):
                text = text[4:].strip()

        data = json.loads(text)
        # minimal validation
        for k in ["summary","mood_direction","key_insights","suggestions","strengths","possible_triggers","recommend_followup"]:
            if k not in data:
                raise ValueError(f"Missing key: {k}")
        return data

    except Exception as e:
        print("Groq structured summary failed:", e)
        # safe fallback
        return {
            "summary": "Unable to generate detailed insights right now.",
            "mood_direction": "stable",
            "key_insights": [],
            "suggestions": ["Take a short mindful walk", "Try slow breathing", "Write a 3-line journal", "Hydrate and stretch"],
            "strengths": ["You keep showing up", "You care about your wellbeing"],
            "possible_triggers": [],
            "recommend_followup": False
        }
