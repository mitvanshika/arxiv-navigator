

import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pyvis.network import Network
import networkx as nx


def load_enriched_papers(topic: str) -> list[dict]:
    filename = f"data/{topic.replace(' ', '_')}_enriched.json"
    if not os.path.exists(filename):
        print(f"❌ No enriched data found at {filename}")
        print("   Run main_gemini.py first.")
        sys.exit(1)
    with open(filename) as f:
        return json.load(f)


def build_graph(papers: list[dict]) -> nx.DiGraph:
    """Build a directed graph where concepts are nodes and dependencies are edges."""
    G = nx.DiGraph()

    difficulty_colors = {
        "beginner": "#2ecc71",       # green
        "intermediate": "#f39c12",   # orange
        "advanced": "#e74c3c",       # red
    }

    # Add paper nodes
    for paper in papers:
        difficulty = paper.get("difficulty", "intermediate")
        color = difficulty_colors.get(difficulty, "#f39c12")
        summary = paper.get("one_line_summary", "")[:80]
        title = paper.get("title", "Unknown")[:50]

        G.add_node(
            title,
            label=title,
            color=color,
            size=25,
            title=f"📄 {paper.get('title', '')}\n\n{summary}\n\nDifficulty: {difficulty}",
            group=difficulty,
            shape="dot"
        )

    # Add concept nodes and connect them to papers
    all_concepts = {}
    for paper in papers:
        title = paper.get("title", "Unknown")[:50]
        for concept in paper.get("main_concepts", []):
            concept = concept.strip().lower()
            if not concept:
                continue
            if concept not in all_concepts:
                all_concepts[concept] = []
                G.add_node(
                    concept,
                    label=concept,
                    color="#3498db",   # blue
                    size=15,
                    title=f"💡 Concept: {concept}",
                    group="concept",
                    shape="diamond"
                )
            all_concepts[concept].append(title)
            G.add_edge(title, concept, color="#cccccc", width=1)

    # Connect papers that share concepts (they're related)
    concept_to_papers = {}
    for paper in papers:
        title = paper.get("title", "Unknown")[:50]
        for concept in paper.get("builds_upon", []):
            concept = concept.strip().lower()
            if concept in all_concepts:
                G.add_edge(
                    concept, title,
                    color="#e74c3c",
                    width=2,
                    title="builds upon"
                )

    return G


def visualize(G: nx.DiGraph, output_file: str = "data/knowledge_graph.html"):
    """Render the graph as an interactive HTML file."""
    net = Network(
        height="750px",
        width="100%",
        bgcolor="#1a1a2e",
        font_color="white",
        directed=True
    )

    net.from_nx(G)

    # Physics settings for nice layout
    net.set_options("""
    {
      "physics": {
        "enabled": true,
        "forceAtlas2Based": {
          "gravitationalConstant": -50,
          "centralGravity": 0.01,
          "springLength": 150,
          "springConstant": 0.08
        },
        "solver": "forceAtlas2Based",
        "stabilization": {
          "enabled": true,
          "iterations": 200
        }
      },
      "interaction": {
        "hover": true,
        "tooltipDelay": 100
      }
    }
    """)

    os.makedirs("data", exist_ok=True)
    net.save_graph(output_file)
    print(f"✅ Knowledge graph saved to {output_file}")
    print(f"   Open this file in your browser to see the interactive graph!")
    return output_file


def print_summary(papers: list[dict]):
    """Print a text summary of the knowledge graph."""
    print("\n📊 Knowledge Graph Summary:")
    print(f"   Papers: {len(papers)}")

    all_concepts = set()
    for p in papers:
        all_concepts.update(p.get("main_concepts", []))
    print(f"   Unique concepts: {len(all_concepts)}")

    print("\n🔑 Top concepts across all papers:")
    concept_count = {}
    for p in papers:
        for c in p.get("main_concepts", []):
            concept_count[c] = concept_count.get(c, 0) + 1
    top = sorted(concept_count.items(), key=lambda x: x[1], reverse=True)[:10]
    for concept, count in top:
        print(f"   • {concept} ({count} papers)")


# ── RUN IT ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    TOPIC = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "transformer architecture"

    print(f"\n🗺️  Building knowledge graph for: '{TOPIC}'")

    papers = load_enriched_papers(TOPIC)
    print(f"   Loaded {len(papers)} enriched papers")

    G = build_graph(papers)
    print(f"   Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    output = visualize(G)
    print_summary(papers)

    print(f"\n🌐 Open this in your browser:")
    print(f"   {os.path.abspath(output)}")