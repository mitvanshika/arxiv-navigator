from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, json, pickle
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ArXiv Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

vectorstore_cache = {}
llm_instance = None

def get_llm():
    global llm_instance
    if llm_instance is None:
        from langchain_groq import ChatGroq
        llm_instance = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key="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",
            temperature=0
        )
    return llm_instance


class SearchRequest(BaseModel):
    topic: str
    max_papers: int = 12

class QuestionRequest(BaseModel):
    topic: str
    question: str

class BuildIndexRequest(BaseModel):
    topic: str


@app.get("/")
def root():
    return {"status": "ArXiv Navigator API running"}


@app.post("/api/search")
def search_papers(req: SearchRequest):
    try:
        from core.fetcher import fetch_papers, save_papers
        topic_key = req.topic.replace(" ", "_")

        # Cache check
        papers_path = f"data/{topic_key}_papers.json"
        if os.path.exists(papers_path):
            print(f"✅ Papers cache hit for '{req.topic}'")
            with open(papers_path) as f:
                papers = json.load(f)
            return {"papers": papers, "count": len(papers)}

        papers = fetch_papers(req.topic, max_papers=req.max_papers)

        # Add relevance scores (10/10 for first, decreasing)
        total = len(papers)
        for i, p in enumerate(papers):
            score = round(10 - (i / max(total - 1, 1)) * 9, 1)
            p["relevance_score"] = score

        save_papers(papers, req.topic)
        print(f"✅ Fetched {len(papers)} papers for '{req.topic}'")
        return {"papers": papers, "count": len(papers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/topic-overview")
def topic_overview(req: SearchRequest):
    try:
        from core.concepts_gemini import generate_topic_overview
        topic_key = req.topic.replace(" ", "_")

        cache_path = f"data/{topic_key}_overview.json"
        if os.path.exists(cache_path):
            print(f"✅ Overview cache hit for '{req.topic}'")
            with open(cache_path) as f:
                return json.load(f)

        llm = get_llm()
        overview = generate_topic_overview(llm, req.topic)

        os.makedirs("data", exist_ok=True)
        with open(cache_path, "w") as f:
            json.dump(overview, f, indent=2)

        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/enrich")
def enrich_papers(req: SearchRequest):
    try:
        from core.concepts_gemini import extract_all_concepts, build_reading_order
        topic_key = req.topic.replace(" ", "_")

        enriched_path = f"data/{topic_key}_enriched.json"
        if os.path.exists(enriched_path):
            print(f"✅ Enrich cache hit for '{req.topic}'")
            with open(enriched_path) as f:
                papers = json.load(f)
            return {"papers": papers, "count": len(papers)}

        raw_path = f"data/{topic_key}_papers.json"
        if not os.path.exists(raw_path):
            raise HTTPException(status_code=404, detail="Run /api/search first.")

        with open(raw_path) as f:
            papers = json.load(f)

        print(f"🔥 Enriching '{req.topic}' ({len(papers)} papers)...")
        enriched = extract_all_concepts(papers)
        ordered = build_reading_order(enriched)

        os.makedirs("data", exist_ok=True)
        with open(enriched_path, "w") as f:
            json.dump(ordered, f, indent=2)

        print(f"✅ Enrichment complete — {len(ordered)} papers")
        return {"papers": ordered, "count": len(ordered)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/papers/{topic}")
def get_papers(topic: str):
    topic_key = topic.replace(" ", "_")
    enriched_path = f"data/{topic_key}_enriched.json"
    raw_path = f"data/{topic_key}_papers.json"
    if os.path.exists(enriched_path):
        with open(enriched_path) as f:
            return {"papers": json.load(f), "enriched": True}
    elif os.path.exists(raw_path):
        with open(raw_path) as f:
            return {"papers": json.load(f), "enriched": False}
    raise HTTPException(status_code=404, detail="No papers found")


@app.post("/api/build-index")
def build_index(req: BuildIndexRequest):
    return {"message": "Index skipped", "chunks": 0}


@app.post("/api/ask")
def ask_question(req: QuestionRequest):
    try:
        topic_key = req.topic.replace(" ", "_")
        enriched_path = f"data/{topic_key}_enriched.json"
        raw_path = f"data/{topic_key}_papers.json"

        if os.path.exists(enriched_path):
            with open(enriched_path) as f:
                papers = json.load(f)
        elif os.path.exists(raw_path):
            with open(raw_path) as f:
                papers = json.load(f)
        else:
            raise HTTPException(status_code=404, detail="No papers found for this topic.")

        context = ""
        sources = []
        for p in papers[:8]:
            title = p.get("title", "")
            summary = p.get("summary", "")[:500]
            problem = p.get("problem", "")
            method = p.get("method", "")
            context += f"\n\nPaper: {title}\nSummary: {summary}"
            if problem:
                context += f"\nProblem: {problem}"
            if method:
                context += f"\nMethod: {method}"
            sources.append(title)

        llm = get_llm()
        prompt = f"""You are a helpful ML research assistant explaining things to a student.
Using the research papers below, answer the question in plain simple English.
If the papers don't cover the question well, say so honestly.

Papers:
{context}

Question: {req.question}

Answer in 3-5 sentences, simple English, no jargon:"""

        response = llm.invoke(prompt)
        return {
            "original_query": req.question,
            "final_answer": response.content,
            "healed": False,
            "attempts": [{"answer": response.content, "sources": sources}]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph/{topic}")
def get_graph(topic: str):
    try:
        topic_key = topic.replace(" ", "_")
        enriched_path = f"data/{topic_key}_enriched.json"

        if not os.path.exists(enriched_path):
            raise HTTPException(status_code=404, detail="Enriched data not found")

        with open(enriched_path) as f:
            papers = json.load(f)

        nodes = []
        edges = []

        difficulty_colors = {
            "beginner": "#22c55e",
            "intermediate": "#f59e0b",
            "advanced": "#ef4444",
        }

        # Build title -> short title map
        title_map = {}
        for paper in papers:
            full = paper.get("title", "Unknown")
            short = full[:50]
            title_map[full] = short

        # Add paper nodes
        for paper in papers:
            title = paper.get("title", "Unknown")
            short = title[:50]
            difficulty = paper.get("difficulty", "intermediate")
            nodes.append({
                "id": short,
                "label": short,
                "type": "paper",
                "difficulty": difficulty,
                "color": difficulty_colors.get(difficulty, "#f59e0b"),
                "summary": paper.get("one_line_summary", ""),
            })

        # Add relationship edges
        for paper in papers:
            source = paper.get("title", "")[:50]

            for rel_title in paper.get("builds_on", []):
                # Find matching paper
                for full_title, short_title in title_map.items():
                    if rel_title.lower() in full_title.lower() or full_title.lower() in rel_title.lower():
                        if short_title != source:
                            edges.append({
                                "source": source,
                                "target": short_title,
                                "type": "builds_on"
                            })
                        break

            for rel_title in paper.get("compares_to", []):
                for full_title, short_title in title_map.items():
                    if rel_title.lower() in full_title.lower() or full_title.lower() in rel_title.lower():
                        if short_title != source:
                            edges.append({
                                "source": source,
                                "target": short_title,
                                "type": "compares_to"
                            })
                        break

        return {"nodes": nodes, "edges": edges}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))