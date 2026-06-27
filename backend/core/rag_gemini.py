

import os
import pickle
import numpy as np
import faiss
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from google import genai
from google.genai import types
import time

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def embed_texts(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    all_embeddings = []
    batch_size = 20

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"  Embedding batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}...")

        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=batch,
            config=types.EmbedContentConfig(task_type=task_type)
        )
        for embedding in result.embeddings:
            all_embeddings.append(embedding.values)
        
        time.sleep(15)  # wait 15 seconds between batches

    return all_embeddings

def build_vector_store(chunks: list[dict]) -> dict:
    """Convert chunks into a searchable vector store."""
    print("🔨 Building vector store...")

    docs = [
        Document(
            page_content=chunk["text"],
            metadata={
                "paper_title": chunk["paper_title"],
                "paper_id": chunk["paper_id"],
                "chunk_id": chunk["chunk_id"],
            }
        )
        for chunk in chunks
    ]

    texts = [chunk["text"] for chunk in chunks]
    all_embeddings = embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")

    vectors = np.array(all_embeddings, dtype="float32")
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    os.makedirs("data", exist_ok=True)
    with open("data/docs_store.pkl", "wb") as f:
        pickle.dump(docs, f)
    with open("data/faiss_index.pkl", "wb") as f:
        pickle.dump(index, f)

    print(f"✅ Vector store built with {len(docs)} chunks")
    return {"index": index, "docs": docs}


def retrieve(vectorstore: dict, query: str, k: int = 5) -> list[Document]:
    """Retrieve top-k relevant chunks for a query."""
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
    )
    query_vector = np.array([result.embeddings[0].values], dtype="float32")

    index = vectorstore["index"]
    docs = vectorstore["docs"]

    _, indices = index.search(query_vector, k)
    return [docs[i] for i in indices[0] if i < len(docs)]


def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0
    )


def generate_answer(llm, query: str, docs: list[Document]) -> str:
    """Generate an answer from retrieved docs."""
    context = "\n\n---\n\n".join([d.page_content for d in docs])

    prompt = f"""You are a research assistant. Using ONLY the context below, answer the question.
If the context doesn't contain enough information, say "INSUFFICIENT_CONTEXT".

Context:
{context}

Question: {query}

Answer:"""

    response = llm.invoke(prompt)
    return response.content


def is_bad_answer(llm, query: str, answer: str) -> bool:
    """Self-healing check: did the answer actually address the question?"""
    if "INSUFFICIENT_CONTEXT" in answer:
        return True

    prompt = f"""Did this answer actually address the question? Reply only YES or NO.

Question: {query}
Answer: {answer}

Reply:"""

    response = llm.invoke(prompt)
    verdict = response.content.strip().upper()
    return "NO" in verdict


def reframe_query(llm, original_query: str) -> str:
    """If retrieval failed, reframe the query with different terminology."""
    prompt = f"""The following search query didn't find good results in a research paper database.
Rewrite it using different, more specific academic terminology.
Return ONLY the rewritten query, nothing else.

Original query: {original_query}

Rewritten query:"""

    response = llm.invoke(prompt)
    return response.content.strip()


def self_healing_rag(
    vectorstore: dict,
    llm,
    query: str,
    max_retries: int = 2
) -> dict:
    """
    Full self-healing RAG pipeline:
    1. Retrieve → Generate → Check if answer is good
    2. If bad → Reframe query → Try again
    3. Log every attempt
    """
    attempts = []
    current_query = query

    for attempt in range(max_retries + 1):
        docs = retrieve(vectorstore, current_query)
        answer = generate_answer(llm, query, docs)
        bad = is_bad_answer(llm, query, answer)

        attempts.append({
            "attempt": attempt + 1,
            "query_used": current_query,
            "answer": answer,
            "was_bad": bad,
            "sources": list(set(d.metadata["paper_title"] for d in docs))
        })

        if not bad:
            print(f"✅ Good answer on attempt {attempt + 1}")
            break

        if attempt < max_retries:
            print(f"⚠️  Bad answer on attempt {attempt + 1}, reframing query...")
            current_query = reframe_query(llm, current_query)
            print(f"   New query: {current_query}")

    return {
        "original_query": query,
        "final_answer": attempts[-1]["answer"],
        "healed": len(attempts) > 1 and not attempts[-1]["was_bad"],
        "attempts": attempts,
    }