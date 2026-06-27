import os
import time

def invoke_with_retry(llm, prompt: str, max_retries: int = 3) -> str:
    for attempt in range(max_retries):
        try:
            response = llm.invoke(prompt)
            return response.content.strip()
        except Exception as e:
            if "429" in str(e) or "rate_limit" in str(e).lower():
                wait = 15 * (attempt + 1)
                print(f"  ⏳ Rate limit — waiting {wait}s")
                time.sleep(wait)
            else:
                raise
    raise Exception("Max retries exceeded")


def build_context(papers: list) -> tuple[str, list]:
    """Build compact context string from papers."""
    parts = []
    sources = []
    for p in papers[:8]:
        title = p.get("title", "")
        lines = [f"Paper: {title}"]
        if p.get("problem"):
            lines.append(f"Problem: {p['problem']}")
        if p.get("method"):
            lines.append(f"Method: {p['method']}")
        if p.get("results"):
            lines.append(f"Results: {p['results']}")
        if not p.get("problem"):
            lines.append(f"Abstract: {p.get('summary', '')[:400]}")
        parts.append("\n".join(lines))
        sources.append(title)
    return "\n\n---\n\n".join(parts), sources


def generate_answer(llm, question: str, context: str) -> str:
    prompt = f"""You are an ML research assistant explaining things simply to a student.
Using ONLY the papers below, answer the question in 3-5 plain sentences.
If the papers don't cover it well, say "INSUFFICIENT_CONTEXT".

{context}

Question: {question}
Answer:"""
    return invoke_with_retry(llm, prompt)


def is_bad_answer(llm, question: str, answer: str) -> bool:
    """Self-check: did the answer actually address the question?"""
    if "INSUFFICIENT_CONTEXT" in answer:
        return True
    if len(answer.strip()) < 30:
        return True

    prompt = f"""Did this answer actually address the question asked? Reply only YES or NO.

Question: {question}
Answer: {answer}

Reply:"""
    try:
        verdict = invoke_with_retry(llm, prompt).strip().upper()
        return "NO" in verdict
    except:
        return False


def reframe_query(llm, original_query: str) -> str:
    """Reframe a failed query using different academic terminology."""
    prompt = f"""This search query didn't find good results in a research paper database.
Rewrite it using different, more specific academic terminology.
Return ONLY the rewritten query, nothing else.

Original: {original_query}
Rewritten:"""
    try:
        return invoke_with_retry(llm, prompt).strip()
    except:
        return original_query + " machine learning"


def self_healing_rag(llm, question: str, papers: list, max_retries: int = 2) -> dict:
    """
    Full self-healing RAG pipeline:
    1. Generate answer from paper context
    2. Judge if answer is good
    3. If bad → reframe query → try again
    4. Return all attempts + final answer
    """
    context, sources = build_context(papers)
    attempts = []
    current_question = question

    for attempt in range(max_retries + 1):
        print(f"  🔍 RAG attempt {attempt + 1} — query: {current_question[:60]}")

        answer = generate_answer(llm, current_question, context)
        bad = is_bad_answer(llm, question, answer)  # always judge against original

        attempts.append({
            "attempt": attempt + 1,
            "query_used": current_question,
            "answer": answer,
            "was_bad": bad,
            "sources": sources,
        })

        if not bad:
            print(f"  ✅ Good answer on attempt {attempt + 1}")
            break

        if attempt < max_retries:
            print(f"  ⚠️  Bad answer — reframing query...")
            current_question = reframe_query(llm, current_question)
            print(f"  → New query: {current_question[:60]}")
            time.sleep(3)  

    healed = len(attempts) > 1 and not attempts[-1]["was_bad"]
    return {
        "original_query": question,
        "final_answer": attempts[-1]["answer"] if not attempts[-1]["was_bad"] else f"The loaded papers don't cover this specific angle well.",
        "healed": healed,
        "attempts": attempts,
        "total_attempts": len(attempts),
    }