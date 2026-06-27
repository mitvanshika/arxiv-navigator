"""
STEP 2: Parse PDFs and chunk them for RAG
Run this after fetcher.py works.
"""

import fitz  # PyMuPDF
import os
from tqdm import tqdm


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from a PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        print(f"⚠️  Could not parse {pdf_path}: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """
    Split text into overlapping chunks.
    overlap means each chunk shares some text with the next — 
    this prevents cutting a concept in half.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap  # slide forward with overlap
    return chunks


def parse_all_pdfs(pdf_paths: list[str], papers_metadata: list[dict]) -> list[dict]:
    """
    Parse all PDFs and return chunks with metadata attached.
    Each chunk knows which paper it came from.
    """
    all_chunks = []

    for i, pdf_path in enumerate(tqdm(pdf_paths, desc="Parsing PDFs")):
        text = extract_text_from_pdf(pdf_path)
        
        if not text:
            continue

        # Only use first 15000 chars (intro + methods) — most important parts
        text = text[:15000]
        chunks = chunk_text(text)

        # Attach paper metadata to each chunk
        paper_meta = papers_metadata[i] if i < len(papers_metadata) else {}
        for j, chunk in enumerate(chunks):
            all_chunks.append({
                "chunk_id": f"{i}_{j}",
                "paper_title": paper_meta.get("title", "Unknown"),
                "paper_id": paper_meta.get("id", ""),
                "published": paper_meta.get("published", ""),
                "text": chunk,
            })

    print(f"✅ Created {len(all_chunks)} chunks from {len(pdf_paths)} papers")
    return all_chunks


# ── TEST IT ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    import glob

    TOPIC = "transformer architecture attention mechanism"
    
    # Load paper metadata
    with open(f"data/{TOPIC.replace(' ', '_')}_papers.json") as f:
        papers = json.load(f)

    # Get PDF paths
    pdf_folder = f"data/{TOPIC.replace(' ', '_')}_pdfs"
    pdf_paths = sorted(glob.glob(f"{pdf_folder}/*.pdf"))
    print(f"Found {len(pdf_paths)} PDFs")

    # Parse and chunk
    chunks = parse_all_pdfs(pdf_paths, papers)

    # Show a sample chunk
    if chunks:
        print(f"\n📝 Sample chunk from: {chunks[0]['paper_title'][:60]}")
        print(f"   Text preview: {chunks[0]['text'][:200]}...")