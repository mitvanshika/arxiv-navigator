

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { api } from "../api";

export default function FeedbackButtons({ topic, question, answer, sources = [] }) {
  const [vote, setVote] = useState(null);   // null | 1 | -1
  const [loading, setLoading] = useState(false);

  async function handleVote(rating) {
    if (vote !== null || loading) return;
    setLoading(true);
    try {
      await api.post("/api/feedback", {
        topic,
        question,
        answer,
        rating,
        sources,
      });
      setVote(rating);
    } catch (e) {
      console.error("Feedback failed", e);
    } finally {
      setLoading(false);
    }
  }

  if (vote !== null) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-green-400">
        <CheckCircle size={13} />
        <span>Thanks for the feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500">Was this helpful?</span>
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        title="Helpful"
        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors disabled:opacity-40"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        title="Not helpful"
        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}