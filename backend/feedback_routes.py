
import json
import os
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import BytesIO

router = APIRouter()

FEEDBACK_FILE = Path("data/feedback.json")
FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)




class FeedbackPayload(BaseModel):
    topic: str
    question: str
    answer: str
    rating: int          
    sources: list[str] = []


class ExportPayload(BaseModel):
    topic: str
    overview: dict       
    papers: list[dict]   
    reading_path: list[str] = []




def _load_feedback() -> list[dict]:
    if FEEDBACK_FILE.exists():
        with open(FEEDBACK_FILE) as f:
            return json.load(f)
    return []


def _save_feedback(records: list[dict]):
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(records, f, indent=2)



@router.post("/api/feedback")
async def submit_feedback(payload: FeedbackPayload):
    records = _load_feedback()
    records.append({
        "id": len(records) + 1,
        "timestamp": datetime.utcnow().isoformat(),
        "topic": payload.topic,
        "question": payload.question,
        "answer": payload.answer[:300],   
        "rating": payload.rating,
        "sources": payload.sources,
    })
    _save_feedback(records)
    return {"status": "ok", "total": len(records)}


@router.get("/api/feedback-stats")
async def get_feedback_stats():
    records = _load_feedback()
    if not records:
        return {"total": 0, "positive": 0, "negative": 0, "by_topic": []}

    positive = sum(1 for r in records if r["rating"] == 1)
    negative = sum(1 for r in records if r["rating"] == -1)

   
    topic_map: dict[str, dict] = {}
    for r in records:
        t = r["topic"]
        if t not in topic_map:
            topic_map[t] = {"topic": t, "total": 0, "positive": 0, "negative": 0}
        topic_map[t]["total"] += 1
        if r["rating"] == 1:
            topic_map[t]["positive"] += 1
        else:
            topic_map[t]["negative"] += 1

    by_topic = sorted(topic_map.values(), key=lambda x: x["total"], reverse=True)

    return {
        "total": len(records),
        "positive": positive,
        "negative": negative,
        "satisfaction_pct": round(positive / len(records) * 100, 1),
        "by_topic": by_topic,
        "recent": records[-10:][::-1],   # last 10, newest first
    }



@router.post("/api/export-pdf")
async def export_pdf(payload: ExportPayload):
    """
    Generates a PDF research report using reportlab (pure Python, no binary deps).
    Install: pip install reportlab
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
        )

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm,
        )

        styles = getSampleStyleSheet()
        NAVY = colors.HexColor("#0f1b2d")
        GOLD  = colors.HexColor("#f5c842")
        MUTED = colors.HexColor("#6b7280")

        title_style = ParagraphStyle("title", parent=styles["Title"],
            textColor=NAVY, fontSize=22, spaceAfter=6)
        h2_style = ParagraphStyle("h2", parent=styles["Heading2"],
            textColor=NAVY, fontSize=13, spaceBefore=14, spaceAfter=4)
        body_style = ParagraphStyle("body", parent=styles["Normal"],
            fontSize=10, leading=15, textColor=colors.HexColor("#1f2937"))
        meta_style = ParagraphStyle("meta", parent=styles["Normal"],
            fontSize=9, textColor=MUTED)
        tag_map = {"beginner": "#16a34a", "intermediate": "#d97706", "advanced": "#dc2626"}

        story = []

        # ── Title ──
        story.append(Paragraph(f"ArXiv Navigator — Research Report", title_style))
        story.append(Paragraph(f"Topic: <b>{payload.topic}</b>", h2_style))
        story.append(Paragraph(
            f"Generated {datetime.utcnow().strftime('%d %b %Y, %H:%M')} UTC  •  {len(payload.papers)} papers",
            meta_style))
        story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=12))

        # ── Overview ──
        ov = payload.overview
        if ov:
            story.append(Paragraph("Topic Overview", h2_style))
            if ov.get("explanation"):
                story.append(Paragraph(ov["explanation"], body_style))
            if ov.get("analogy"):
                story.append(Spacer(1, 6))
                story.append(Paragraph(f"<i>Analogy: {ov['analogy']}</i>", meta_style))
            if ov.get("core_problem"):
                story.append(Spacer(1, 6))
                story.append(Paragraph(f"<b>Core problem:</b> {ov['core_problem']}", body_style))
            story.append(Spacer(1, 10))

        # ── Reading path ──
        if payload.reading_path:
            story.append(Paragraph("Suggested Reading Path", h2_style))
            path_text = "  →  ".join(payload.reading_path)
            story.append(Paragraph(path_text, body_style))
            story.append(Spacer(1, 10))

        story.append(HRFlowable(width="100%", thickness=0.5, color=MUTED, spaceAfter=8))

        # ── Papers ──
        story.append(Paragraph("Paper Summaries", h2_style))

        difficulty_order = {"beginner": 0, "intermediate": 1, "advanced": 2}
        sorted_papers = sorted(
            payload.papers,
            key=lambda p: difficulty_order.get(p.get("difficulty", ""), 99)
        )

        for i, paper in enumerate(sorted_papers, 1):
            diff = paper.get("difficulty", "")
            diff_color = tag_map.get(diff, "#6b7280")

            story.append(Paragraph(
                f'{i}. {paper.get("title", "Untitled")} '
                f'<font color="{diff_color}"><b>[{diff.upper()}]</b></font>',
                h2_style))

            if paper.get("authors"):
                authors = ", ".join(paper["authors"][:3])
                if len(paper["authors"]) > 3:
                    authors += " et al."
                story.append(Paragraph(authors, meta_style))

            if paper.get("one_line_summary"):
                story.append(Spacer(1, 4))
                story.append(Paragraph(f"<b>{paper['one_line_summary']}</b>", body_style))

            rows = []
            for key, label in [("problem","Problem"), ("method","Method"),
                                ("results","Results"), ("why_it_matters","Why it matters")]:
                if paper.get(key):
                    rows.append([
                        Paragraph(f"<b>{label}</b>", meta_style),
                        Paragraph(paper[key], body_style),
                    ])

            if rows:
                tbl = Table(rows, colWidths=[3.5*cm, 13*cm])
                tbl.setStyle(TableStyle([
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("TOPPADDING", (0,0), (-1,-1), 4),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
                ]))
                story.append(Spacer(1, 4))
                story.append(tbl)

            if paper.get("relevance_score"):
                story.append(Paragraph(
                    f"Relevance score: {paper['relevance_score']}/10", meta_style))

            story.append(Spacer(1, 8))
            story.append(HRFlowable(width="100%", thickness=0.3, color=colors.HexColor("#e5e7eb")))
            story.append(Spacer(1, 6))

        doc.build(story)
        buffer.seek(0)

        safe_topic = "".join(c for c in payload.topic if c.isalnum() or c in (" ", "-"))[:40]
        filename = f"arxiv-report-{safe_topic.replace(' ', '-')}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except ImportError:
        return {"error": "reportlab not installed. Run: pip install reportlab"}