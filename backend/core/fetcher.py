"""
STEP 1: Fetch papers from ArXiv + re-rank by semantic relevance
"""

import os
import json
import time
import requests
import xml.etree.ElementTree as ET
from tqdm import tqdm


def fetch_papers(topic: str, max_papers: int = 12) -> list[dict]:
    """
    Search ArXiv for papers, then re-rank by semantic relevance.
    Fetches 2x papers, scores them, keeps top max_papers.
    """
    print(f"\n🔍 Searching ArXiv for: '{topic}'")

    params = {
        "search_query": f"all:{topic}",
        "start": 0,
        "max_results": max_papers * 2,
        "sortBy": "relevance",
        "sortOrder": "descending"
    }
    headers = {
        "User-Agent": "ArXivNavigator/1.0 (research tool; mitvanshika@github)"
    }

    papers = []
    for attempt in range(3):
        try:
            response = requests.get(
                "https://arxiv.org/api/query",
                params=params,
                headers=headers,
                timeout=30
            )
            if response.status_code == 503:
                wait = (attempt + 1) * 10
                print(f"⚠️  503 received, retrying in {wait}s (attempt {attempt+1}/3)")
                time.sleep(wait)
                continue
            response.raise_for_status()

            ns = {"atom": "http://www.w3.org/2005/Atom"}
            root = ET.fromstring(response.text)
            for entry in root.findall("atom:entry", ns):
                authors = [
                    a.find("atom:name", ns).text
                    for a in entry.findall("atom:author", ns)[:3]
                ]
                pdf_url = ""
                for link in entry.findall("atom:link", ns):
                    if link.get("type") == "application/pdf":
                        pdf_url = link.get("href", "")
                        break
                papers.append({
                    "id": entry.find("atom:id", ns).text,
                    "title": entry.find("atom:title", ns).text.strip().replace("\n", " "),
                    "authors": authors,
                    "summary": entry.find("atom:summary", ns).text.strip(),
                    "pdf_url": pdf_url,
                    "published": entry.find("atom:published", ns).text[:10],
                    "categories": [c.get("term", "") for c in entry.findall("atom:category", ns)],
                })
            break
        except Exception as e:
            if attempt == 2:
                raise RuntimeError(f"ArXiv fetch failed after 3 attempts: {e}")
            time.sleep(10)

    print(f"✅ Found {len(papers)} papers — re-ranking by relevance...")

    # Re-rank and keep top max_papers
    ranked = rerank_papers(papers, topic, top_k=max_papers)
    print(f"✅ Kept top {len(ranked)} most relevant papers")
    return ranked


def rerank_papers(papers: list[dict], topic: str, top_k: int = 12) -> list[dict]:
    """
    Score each paper 1-10 for relevance to the topic using LLM.
    Returns top_k papers sorted by relevance score.
    """
    if not papers:
        return papers

    try:
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0
        )

        # Score in batches of 6 to avoid rate limits
        batch_size = 6
        scored = []

        for i in range(0, len(papers), batch_size):
            batch = papers[i:i + batch_size]
            batch_scores = score_batch(llm, batch, topic)
            scored.extend(batch_scores)

            if i + batch_size < len(papers):
                time.sleep(8)  # avoid rate limit between batches

        # Sort by score descending, keep top_k
        scored.sort(key=lambda p: p.get("relevance_score", 0), reverse=True)
        return scored[:top_k]

    except Exception as e:
        print(f"⚠️  Re-ranking failed ({e}) — returning original order")
        return papers[:top_k]


def score_batch(llm, papers: list[dict], topic: str) -> list[dict]:
    """Score a batch of papers for relevance to topic."""
    papers_text = ""
    for i, p in enumerate(papers):
        papers_text += f"\n{i+1}. Title: {p['title']}\nAbstract: {p['summary'][:300]}\n"

    prompt = f"""Rate each paper's relevance to the topic "{topic}" on a scale of 1-10.
10 = directly about {topic}, 1 = barely related.

Papers:
{papers_text}

Return ONLY valid JSON array with scores, no markdown:
[{{"index": 1, "score": 8, "reason": "one short sentence"}}, ...]"""

    try:
        response = llm.invoke(prompt)
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        scores = json.loads(text)

        for item in scores:
            idx = item["index"] - 1
            if 0 <= idx < len(papers):
                papers[idx]["relevance_score"] = item["score"]
                papers[idx]["relevance_reason"] = item.get("reason", "")

        return papers

    except Exception as e:
        print(f"⚠️  Batch scoring failed: {e}")
        for p in papers:
            if "relevance_score" not in p:
                p["relevance_score"] = 5
        return papers


def save_papers(papers: list[dict], topic: str) -> str:
    """Save paper metadata to a JSON file."""
    os.makedirs("data", exist_ok=True)
    filename = f"data/{topic.strip().lower().replace(' ', '_')}_papers.json"
    with open(filename, "w") as f:
        json.dump(papers, f, indent=2)
    print(f"💾 Saved to {filename}")
    return filename


def download_pdfs(papers: list[dict], topic: str) -> list[str]:
    """Download PDFs for all papers."""
    folder = f"data/{topic.replace(' ', '_')}_pdfs"
    os.makedirs(folder, exist_ok=True)

    pdf_paths = []
    for paper in tqdm(papers, desc="Downloading PDFs"):
        paper_id = paper["id"].split("/")[-1]
        path = f"{folder}/{paper_id}.pdf"

        if os.path.exists(path):
            pdf_paths.append(path)
            continue

        try:
            response = requests.get(paper["pdf_url"], timeout=30)
            with open(path, "wb") as f:
                f.write(response.content)
            pdf_paths.append(path)
        except Exception as e:
            print(f"⚠️  Failed to download {paper['title'][:40]}: {e}")

    print(f"✅ Downloaded {len(pdf_paths)} PDFs to {folder}/")
    return pdf_paths


if __name__ == "__main__":
    TOPIC = "transformer architecture attention mechanism"
    papers = fetch_papers(TOPIC, max_papers=10)
    save_papers(papers, TOPIC)

    print("\n📄 Papers found (ranked by relevance):")
    for i, p in enumerate(papers, 1):
        score = p.get('relevance_score', '?')
        reason = p.get('relevance_reason', '')
        print(f"  {i}. [{score}/10] {p['title'][:60]}...")
        if reason:
            print(f"       → {reason}")