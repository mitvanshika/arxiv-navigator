import requests
import time
import xml.etree.ElementTree as ET
from urllib.parse import urlencode

ARXIV_API_URL = "https://arxiv.org/api/query"
HEADERS = {
    "User-Agent": "ArXivNavigator/1.0 (research tool; contact: your@email.com)"
}

def fetch_papers(topic: str, max_papers: int = 12) -> list[dict]:
    print(f"\n🔍 Searching ArXiv for: '{topic}'")

    params = {
        "search_query": f"all:{topic}",
        "start": 0,
        "max_results": max_papers * 2,
        "sortBy": "relevance",
        "sortOrder": "descending"
    }

    papers = []
    retries = 3

    for attempt in range(retries):
        try:
            response = requests.get(
                ARXIV_API_URL,
                params=params,
                headers=HEADERS,
                timeout=30
            )

            if response.status_code == 503:
                wait = (attempt + 1) * 10  # 10s, 20s, 30s
                print(f"⚠️  503 received, retrying in {wait}s (attempt {attempt+1}/{retries})")
                time.sleep(wait)
                continue

            response.raise_for_status()
            papers = parse_arxiv_xml(response.text)
            break

        except requests.RequestException as e:
            if attempt == retries - 1:
                raise RuntimeError(f"ArXiv fetch failed after {retries} attempts: {e}")
            time.sleep(10)

    print(f"✅ Found {len(papers)} papers — re-ranking by relevance...")
    ranked = rerank_papers(papers, topic, top_k=max_papers)
    print(f"✅ Kept top {len(ranked)} most relevant papers")
    return ranked


def parse_arxiv_xml(xml_text: str) -> list[dict]:
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom"
    }
    root = ET.fromstring(xml_text)
    papers = []

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

        categories = [
            c.get("term", "")
            for c in entry.findall("atom:category", ns)
        ]

        papers.append({
            "id": entry.find("atom:id", ns).text,
            "title": entry.find("atom:title", ns).text.strip().replace("\n", " "),
            "authors": authors,
            "summary": entry.find("atom:summary", ns).text.strip(),
            "pdf_url": pdf_url,
            "published": entry.find("atom:published", ns).text[:10],
            "categories": categories,
        })

    return papers