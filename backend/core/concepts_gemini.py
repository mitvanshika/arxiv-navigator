import json
import os
import time


def get_llm():
    from langchain_groq import ChatGroq
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key="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",
        temperature=0
    )


def generate_topic_overview(llm, topic: str) -> dict:
    prompt = f"""You are explaining a machine learning topic to a smart 18-year-old student.

Topic: {topic}

Return ONLY valid JSON, no markdown, no extra text:
{{
  "what_is_it": "Explain what {topic} is in 2-3 simple sentences. No jargon.",
  "core_problem": "What problem does {topic} solve? 1-2 sentences.",
  "key_concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "why_it_matters": "Why should someone learning ML care about this? 1 sentence.",
  "analogy": "Explain {topic} using a simple real-world analogy in 1-2 sentences."
}}"""

    try:
        response = llm.invoke(prompt)
        text = response.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"⚠️  Topic overview error: {e}")
        return {
            "what_is_it": f"{topic} is an important area of machine learning research.",
            "core_problem": "Researchers are working to improve AI systems in this area.",
            "key_concepts": [topic],
            "why_it_matters": "This topic is actively researched and has practical applications.",
            "analogy": ""
        }


def extract_concepts_from_paper(llm, paper: dict, all_titles: list) -> dict:
    titles_list = "\n".join([f"- {t}" for t in all_titles if t != paper['title']])

    prompt = f"""Analyze this ML research paper. Explain everything simply for a student.
Return ONLY valid JSON, no markdown fences, no extra text.

Paper title: {paper['title']}
Abstract: {paper['summary'][:1000]}

Other papers in this collection:
{titles_list}

Return exactly this JSON:
{{
  "problem": "What specific problem does this paper solve? 1-2 simple sentences.",
  "method": "How did they solve it? Explain simply, no jargon, 1-2 sentences.",
  "results": "What were the key findings? Be specific with numbers if mentioned.",
  "why_it_matters": "Why does this matter? 1 sentence a student can understand.",
  "main_concepts": ["concept1", "concept2", "concept3"],
  "difficulty": "intermediate",
  "one_line_summary": "One sentence summary a student can understand.",
  "builds_on": ["exact title of paper this builds upon from the list above, or empty"],
  "compares_to": ["exact title of paper this compares against from the list above, or empty"]
}}

For difficulty, follow these rules STRICTLY:
beginner = survey/overview/tutorial paper, introduces concept from scratch, title has words like: survey, overview, introduction, tutorial, review
intermediate = standard research paper improving existing methods, assumes basic ML knowledge
advanced = highly mathematical, novel theory, very niche subfield

Distribute realistically: ~25% beginner, ~50% intermediate, ~25% advanced
difficulty must be exactly one of: beginner, intermediate, advanced

For builds_on and compares_to: only include titles that ACTUALLY appear in the list above.
If none apply, use empty arrays."""

    try:
        response = llm.invoke(prompt)
        text = response.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"⚠️  Could not extract from '{paper['title'][:40]}': {e}")
        return {
            "problem": "",
            "method": "",
            "results": "",
            "why_it_matters": "",
            "main_concepts": [],
            "difficulty": "intermediate",
            "one_line_summary": paper["summary"][:120],
            "builds_on": [],
            "compares_to": []
        }


def extract_all_concepts(papers: list[dict]) -> list[dict]:
    llm = get_llm()
    enriched_papers = []
    all_titles = [p["title"] for p in papers]

    for i, paper in enumerate(papers):
        print(f"  [{i+1}/{len(papers)}] {paper['title'][:60]}...")
        concepts = extract_concepts_from_paper(llm, paper, all_titles)
        difficulty = concepts.get("difficulty", "intermediate")
        print(f"    → difficulty: {difficulty}")
        enriched_papers.append({**paper, **concepts})
        if i < len(papers) - 1:
            time.sleep(2)

    return enriched_papers


def build_reading_order(enriched_papers: list[dict]) -> list[dict]:
    order = {"beginner": 0, "intermediate": 1, "advanced": 2}
    return sorted(
        enriched_papers,
        key=lambda p: order.get(p.get("difficulty", "intermediate"), 1)
    )