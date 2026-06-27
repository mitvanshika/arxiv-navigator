import json
import os
from datetime import datetime

FEEDBACK_FILE = "data/feedback.json"

def load_feedback() -> list:
    if not os.path.exists(FEEDBACK_FILE):
        return []
    try:
        with open(FEEDBACK_FILE) as f:
            return json.load(f)
    except:
        return []

def save_feedback(entry: dict):
    os.makedirs("data", exist_ok=True)
    feedback = load_feedback()
    feedback.append({**entry, "timestamp": datetime.now().isoformat()})
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(feedback, f, indent=2)

def get_feedback_summary() -> dict:
    feedback = load_feedback()
    if not feedback:
        return {"total": 0, "positive": 0, "negative": 0, "examples": []}

    positive = [f for f in feedback if f.get("rating") == "up"]
    negative = [f for f in feedback if f.get("rating") == "down"]

    return {
        "total": len(feedback),
        "positive": len(positive),
        "negative": len(negative),
        "positive_rate": round(len(positive) / len(feedback) * 100) if feedback else 0,
        "recent_negative": [
            {"field": f.get("field"), "comment": f.get("comment", ""), "paper": f.get("paper_title", "")[:60]}
            for f in negative[-5:]
        ],
        "examples": feedback[-10:]
    }

def get_prompt_injection() -> str:
    """Build a feedback hint to inject into enrichment prompts."""
    feedback = load_feedback()
    negative = [f for f in feedback if f.get("rating") == "down" and f.get("comment")]
    if not negative:
        return ""

    hints = []
    for f in negative[-5:]:
        field = f.get("field", "")
        comment = f.get("comment", "")
        if field and comment:
            hints.append(f'- For "{field}": users said "{comment}" — avoid this')

    if not hints:
        return ""

    return "\n\nUser feedback to improve your response:\n" + "\n".join(hints)