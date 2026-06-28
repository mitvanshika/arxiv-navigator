

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, BarChart2, MessageSquare, TrendingUp } from "lucide-react";
import { api } from "../api";

export default function FeedbackDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/feedback-stats")
      .then(r => setStats(r.data))
      .catch(() => setError("Could not load feedback stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-400">
        Loading feedback data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  const { total, positive, negative, satisfaction_pct, by_topic, recent } = stats;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={22} className="text-yellow-400" />
          Answer Quality Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Tracks 👍 / 👎 ratings from the research chatbot across all topics.
        </p>
      </div>

      {total === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No feedback collected yet. Ask some questions and rate the answers!</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total ratings", value: total, icon: <MessageSquare size={18} />, color: "text-blue-400" },
              { label: "Helpful", value: positive, icon: <ThumbsUp size={18} />, color: "text-green-400" },
              { label: "Not helpful", value: negative, icon: <ThumbsDown size={18} />, color: "text-red-400" },
              { label: "Satisfaction", value: `${satisfaction_pct}%`, icon: <TrendingUp size={18} />, color: "text-yellow-400" },
            ].map(card => (
              <div key={card.label}
                className="bg-[#161b22] border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                <span className={`${card.color} flex items-center gap-1.5 text-sm font-medium`}>
                  {card.icon} {card.label}
                </span>
                <span className="text-2xl font-bold text-white">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Satisfaction bar */}
          <div className="bg-[#161b22] border border-white/10 rounded-xl p-5 mb-8">
            <p className="text-sm text-gray-400 mb-3">Overall satisfaction</p>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-yellow-400 rounded-full transition-all duration-700"
                style={{ width: `${satisfaction_pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{satisfaction_pct}% of answers rated helpful</p>
          </div>

          {/* By topic */}
          {by_topic.length > 0 && (
            <div className="bg-[#161b22] border border-white/10 rounded-xl p-5 mb-8">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">By topic</h2>
              <div className="space-y-3">
                {by_topic.map(t => {
                  const pct = t.total > 0 ? Math.round(t.positive / t.total * 100) : 0;
                  return (
                    <div key={t.topic}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-200 truncate max-w-[60%]">{t.topic}</span>
                        <span className="text-gray-400 text-xs">
                          {t.positive}↑ {t.negative}↓ · {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recent && recent.length > 0 && (
            <div className="bg-[#161b22] border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent ratings</h2>
              <div className="space-y-3">
                {recent.map(r => (
                  <div key={r.id} className="flex items-start gap-3">
                    <span className={`mt-0.5 ${r.rating === 1 ? "text-green-400" : "text-red-400"}`}>
                      {r.rating === 1 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{r.question}</p>
                      <p className="text-xs text-gray-500">
                        {r.topic} · {new Date(r.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}