# ArXiv Navigator — ML Research Intelligence

**Enter a topic. AI fetches, ranks, enriches, and maps the entire research field for you.**
## 🔗 Links


|---|---|
**Live Demo** | [arxiv-navigator-omega.vercel.app](https://arxiv-navigator-omega.vercel.app) |
**Backend API** | [arxiv-navigator.onrender.com/docs](https://arxiv-navigator.onrender.com/docs) |
**GitHub** | [github.com/mitvanshika/arxiv-navigator](https://github.com/mitvanshika/arxiv-navigator) |
 First load may take ~30 seconds — free tier backend spins down on inactivity.
## What It Does

Most students searching ML topics get overwhelmed, hundreds of papers, no context, no entry point. ArXiv Navigator turns raw research into a structured, beginner-friendly intelligence dashboard in under 2 minutes.



## AI Features

###  4-Step Agentic Pipeline

```
User enters topic
      ↓
① ArXiv API fetches papers → LLM scores each 1–10 for relevance → re-ranks
      ↓
② LLM generates plain-English topic overview with real-world analogy
      ↓
③ Per-paper structured extraction: Problem · Method · Results · Why it matters
      ↓
④ Cross-paper relationship mapping: "builds on" and "compares to" links
```

Each step runs sequentially with a live progress indicator, users watch the pipeline execute in real time.

---

### 🔁 Self-Healing RAG Chatbot

A retrieval-augmented generation system that actively monitors and corrects its own output.

```
User asks question
      ↓
Retrieve relevant paper chunks (FAISS vector search)
      ↓
LLM generates answer
      ↓
Second LLM call judges answer quality
      ↓
If poor → query automatically reframed → retrieval retries
      ↓
Final answer shown with source papers cited
```

This is not standard RAG — the system detects bad answers and self-corrects. Agentic behaviour built from scratch.

---

### 🧠 LLM Paper Enrichment

Every paper is broken down by a Groq-hosted LLaMA 3.1 model into:

| Field | Description |
|---|---|
| **Problem** | What specific issue this paper solves — plain English |
| **Method** | How they solved it — no jargon |
| **Key Results** | Specific findings and numbers |
| **Why it matters** | One sentence a student can understand |
| **Difficulty** | Beginner / Intermediate / Advanced — classified by LLM from content, not metadata |
| **Relevance score** | 1–10 scored against the user's topic |
| **Relationships** | Which papers this builds on or compares against |

---

### 🗺️ Knowledge Graph (D3.js)

Interactive force-directed graph showing cross-paper relationships extracted by the LLM:

- **Solid lines** — "builds on" relationships
- **Dashed lines** — "compares to" relationships
- **Colour-coded nodes** — Green (beginner) / Amber (intermediate) / Red (advanced)
- Hover for paper title and summary
- Fully draggable and interactive

---

### Feedback Analysis Dashboard

After every AI chat answer, users rate responses 👍 or 👎. The system tracks:

- Which topics produce high vs low quality answers
- Answer quality trends over time
- Most commonly asked questions per topic

Surfaces where the RAG pipeline is underperforming — turns the app into a self-improving research system.

---

### 📄 PDF Report Export

One-click export of a full research report (ReportLab):

- Topic overview and analogy
- All papers sorted by difficulty
- Per-paper breakdown: problem, method, results, why it matters
- Relevance scores
- Suggested reading path

---

### 📚 Learning Roadmap

Auto-generated learning path sorted by LLM-classified difficulty:

```
01 START HERE   ← Beginner papers (foundational, no prior ML needed)
      ↓
02 LEVEL UP     ← Intermediate papers (assumes basic ML knowledge)
      ↓
03 DEEP DIVE    ← Advanced papers (cutting-edge, high complexity)
```

---

### ⚡ Intelligent Caching

Every LLM call result is cached to disk:

- Same topic searched twice → instant load, zero API calls
- Enrichment, overview, and graph all cached separately
- Scales to many users without burning Groq quota

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Animations | Framer Motion — physics-based floating chips, 3D card tilt, parallax |
| Visualisation | D3.js force-directed knowledge graph |
| Backend | FastAPI + Uvicorn |
| LLM | Groq API — LLaMA 3.1 8B Instant |
| Vector Search | FAISS (RAG retrieval) |
| Paper Retrieval | ArXiv REST API with retry logic and User-Agent handling |
| PDF Generation | ReportLab |
| Caching | JSON disk cache |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Architecture

```
arxiv-navigator/
├── backend/
│   ├── main.py                  # FastAPI routes + caching logic
│   ├── feedback_routes.py       # Feedback API + PDF export
│   └── core/
│       ├── fetcher.py           # ArXiv API + LLM relevance scoring
│       ├── parser.py            # PDF parsing + chunking
│       ├── rag_gemini.py        # Self-healing RAG pipeline
│       └── concepts_gemini.py   # LLM enrichment + relationship extraction
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx      # Animated hero + physics chips
        │   ├── ResearchPage.jsx     # Split-screen research dashboard
        │   └── FeedbackDashboard.jsx # Answer quality analytics
        └── components/
            ├── ChatInterface.jsx    # Self-healing RAG chat UI
            ├── FeedbackButtons.jsx  # 👍 👎 rating system
            ├── Roadmap.jsx          # Difficulty-sorted learning path
            ├── KnowledgeGraph.jsx   # D3 relationship graph
            └── StarField.jsx        # Canvas star animation
```

---

## What Makes It Stand Out

**Self-healing RAG** — the system judges its own answer quality and retries with a reframed query if it fails. This is agentic behaviour — not just retrieval, but self-correction.

**Relationship extraction at scale** — instead of summarising papers in isolation, the LLM identifies cross-paper dependencies across the entire result set and renders them as an interactive graph.

**LLM-based difficulty classification** — the model reads each paper's content and classifies it as beginner/intermediate/advanced, giving students a genuine entry point into any research area.

**Full feedback loop** — user ratings feed into a dashboard that surfaces which topics and questions the RAG pipeline handles poorly, creating a path toward continuous improvement.

**Physics-based UI** — landing page chips float with real velocity, momentum, and cursor repulsion using Framer Motion and `requestAnimationFrame`.

---

## Local Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
# Add GROQ_API_KEY to backend/.env
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`


**Vanshika Mittal** — 2nd year B.Tech CS, GTBIT (GGSIPU)
Agentic AI Intern @ Genpact · GDG On Campus Member
[github.com/mitvanshika](https://github.com/mitvanshika)
