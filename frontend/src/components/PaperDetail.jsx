import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Calendar, Users, ExternalLink, Lightbulb, Wrench, BarChart2, Zap } from 'lucide-react'
import axios from 'axios'

const DIFFICULTY_COLORS = {
  beginner: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' },
  intermediate: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
}

function FeedbackButtons({ paperTitle, field, content }) {
  const [voted, setVoted] = useState(null) // "up" | "down" | null
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitFeedback = async (rating, commentText = '') => {
    try {
      await axios.post('/api/feedback', {
        paper_title: paperTitle,
        field,
        rating,
        comment: commentText,
      })
      setVoted(rating)
      setSubmitted(true)
      setShowComment(false)
    } catch (e) {
      console.error('Feedback failed:', e)
    }
  }

  const handleThumbsDown = () => {
    setShowComment(true)
  }

  if (submitted) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-xs font-mono"
        style={{ color: voted === 'up' ? '#22c55e' : '#f59e0b' }}
      >
        {voted === 'up' ? '✓ helpful' : '✓ noted'}
      </motion.span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => submitFeedback('up')}
          className="p-1 rounded transition-colors hover:text-green-400 text-gray-700"
        >
          <ThumbsUp size={11} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleThumbsDown}
          className="p-1 rounded transition-colors hover:text-red-400 text-gray-700"
        >
          <ThumbsDown size={11} />
        </motion.button>
      </div>

      {/* Comment box for negative feedback */}
      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-1"
          >
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What was wrong? (optional)"
              className="text-xs px-2 py-1 rounded bg-transparent text-gray-400 placeholder-gray-700 outline-none"
              style={{ border: '1px solid rgba(239,68,68,0.2)' }}
              onKeyDown={e => e.key === 'Enter' && submitFeedback('down', comment)}
              autoFocus
            />
            <div className="flex gap-1">
              <button
                onClick={() => submitFeedback('down', comment)}
                className="text-xs px-2 py-0.5 rounded text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                Submit
              </button>
              <button
                onClick={() => setShowComment(false)}
                className="text-xs px-2 py-0.5 rounded text-gray-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PaperDetail({ paper }) {
  if (!paper) return (
    <div className="flex items-center justify-center h-full text-gray-600 text-sm">
      Select a paper to see details
    </div>
  )

  const difficulty = paper.difficulty || 'intermediate'
  const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.intermediate

  const sections = [
    { key: 'problem', label: 'Problem', icon: Lightbulb, color: '#f59e0b' },
    { key: 'method', label: 'Method', icon: Wrench, color: '#3b82f6' },
    { key: 'results', label: 'Key Results', icon: BarChart2, color: '#22c55e' },
    { key: 'why_it_matters', label: 'Why it matters', icon: Zap, color: '#c9a84c' },
  ]

  return (
    <motion.div
      key={paper.title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full overflow-y-auto pr-1"
    >
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-mono"
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
            {difficulty}
          </span>
          {paper.published && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Calendar size={10} /> {paper.published}
            </span>
          )}
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-xs text-gold-500 hover:text-gold-300 flex items-center gap-1 transition-colors">
              <ExternalLink size={11} /> PDF
            </a>
          )}
        </div>
        <h2 className="font-display text-lg font-bold text-white leading-snug mb-1">
          {paper.title}
        </h2>
        {paper.authors?.length > 0 && (
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Users size={10} /> {paper.authors.slice(0, 3).join(', ')}
          </p>
        )}
        {paper.one_line_summary && (
          <p className="text-gold-400 text-sm italic mt-2">{paper.one_line_summary}</p>
        )}
      </div>

      {/* 2x2 grid with feedback buttons */}
      {paper.problem && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {sections.map(s => paper[s.key] && (
            <div key={s.key} className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <s.icon size={12} style={{ color: s.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>
                    {s.label}
                  </span>
                </div>
                <FeedbackButtons
                  paperTitle={paper.title}
                  field={s.key}
                  content={paper[s.key]}
                />
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{paper[s.key]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Not enriched yet */}
      {!paper.problem && (
        <div className="rounded-xl p-4 mb-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-amber-400 text-xs mb-2">⏳ Enrichment pending</p>
          <p className="text-gray-500 text-xs leading-relaxed">{paper.summary?.slice(0, 300)}...</p>
        </div>
      )}

      {/* Concepts + Related */}
      <div className="grid grid-cols-2 gap-3">
        {paper.main_concepts?.length > 0 && (
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Key Concepts</p>
            <div className="flex flex-wrap gap-1.5">
              {paper.main_concepts.map(c => (
                <span key={c} className="px-2 py-0.5 rounded-full text-xs font-mono text-gray-400"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {paper.relates_to?.length > 0 && (
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Related Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {paper.relates_to.map(r => (
                <span key={r} className="px-2 py-0.5 rounded-full text-xs font-mono text-gray-400"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Original abstract */}
      {paper.summary && (
        <details className="mt-4">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors select-none">
            Original abstract ▸
          </summary>
          <p className="text-gray-600 text-xs leading-relaxed mt-2 pl-2 border-l border-gray-800">
            {paper.summary}
          </p>
        </details>
      )}
    </motion.div>
  )
}