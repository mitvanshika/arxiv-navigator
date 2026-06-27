import { motion } from 'framer-motion'
import { ArrowDown, BookOpen, Lightbulb, Brain, ExternalLink, ChevronRight } from 'lucide-react'

const DIFFICULTY_CONFIG = {
  beginner: {
    label: 'Start Here',
    sublabel: 'No prior knowledge needed',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    num: '01'
  },
  intermediate: {
    label: 'Level Up',
    sublabel: 'After you understand the basics',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    num: '02'
  },
  advanced: {
    label: 'Deep Dive',
    sublabel: 'For when you want to go further',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    num: '03'
  },
}

function ConceptPill({ concept, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}
    >
      <Lightbulb size={10} />
      {concept}
    </motion.div>
  )
}

function PaperRow({ paper, index, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 group"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color + '44'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
    >
      {/* Number */}
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono font-bold"
        style={{ background: color + '15', border: `1px solid ${color}44`, color }}>
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 leading-snug group-hover:text-white transition-colors mb-1">
          {paper.title}
        </p>
        {paper.one_line_summary && (
          <p className="text-xs text-gray-500 leading-relaxed mb-2">
            {paper.one_line_summary}
          </p>
        )}
        {paper.problem && (
          <p className="text-xs leading-relaxed mb-2" style={{ color: color + 'cc' }}>
            💡 {paper.problem}
          </p>
        )}
        {paper.main_concepts?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {paper.main_concepts.slice(0, 3).map(c => (
              <span key={c} className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'rgba(201,168,76,0.06)', color: '#c9a84c88', border: '1px solid rgba(201,168,76,0.1)' }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PDF link */}
      {paper.pdf_url && (
        <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-xs flex items-center gap-1 transition-colors mt-0.5"
          style={{ color: color + '88' }}
          onMouseEnter={e => e.currentTarget.style.color = color}
          onMouseLeave={e => e.currentTarget.style.color = color + '88'}>
          PDF <ExternalLink size={10} />
        </a>
      )}
    </motion.div>
  )
}

function RoadmapSection({ level, papers, index }) {
  const cfg = DIFFICULTY_CONFIG[level]
  if (!papers?.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.num}
        </div>
        <div>
          <h3 className="font-display font-bold text-lg" style={{ color: cfg.color }}>
            {cfg.label}
          </h3>
          <p className="text-xs text-gray-600">{cfg.sublabel} · {papers.length} papers</p>
        </div>
      </div>

      {/* Papers */}
      <div className="ml-14 space-y-2 mb-2">
        {papers.map((paper, i) => (
          <PaperRow key={paper.id || i} paper={paper} index={i} color={cfg.color} />
        ))}
      </div>
    </motion.div>
  )
}

export default function Roadmap({ papers, overview, topic }) {
  if (!papers?.length) return (
    <div className="card-glass rounded-2xl p-12 text-center text-gray-600 text-sm">
      Search a topic to generate your learning roadmap.
    </div>
  )

  const grouped = {
    beginner: papers.filter(p => p.difficulty === 'beginner'),
    intermediate: papers.filter(p => p.difficulty === 'intermediate'),
    advanced: papers.filter(p => p.difficulty === 'advanced'),
  }

  // Collect all unique concepts across papers
  const allConcepts = [...new Set(
    papers.flatMap(p => p.main_concepts || []).map(c => c.toLowerCase())
  )].slice(0, 10)

  return (
    <div className="max-w-3xl space-y-6">

      {/* Topic header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-gold-400" />
          <span className="text-xs font-mono uppercase tracking-widest text-gold-500">
            Your Learning Roadmap
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2 capitalize">{topic}</h2>

        {overview?.what_is_it && (
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{overview.what_is_it}</p>
        )}
        {overview?.analogy && (
          <p className="text-gray-500 text-xs italic mb-4">💡 {overview.analogy}</p>
        )}

        {/* Key concepts pills */}
        {allConcepts.length > 0 && (
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-mono">Key concepts in this field</p>
            <div className="flex flex-wrap gap-2">
              {allConcepts.map((c, i) => (
                <ConceptPill key={c} concept={c} index={i} />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Arrow */}
      <div className="flex justify-center">
        <ArrowDown size={18} className="text-gray-700" />
      </div>

      {/* Roadmap sections */}
      {['beginner', 'intermediate', 'advanced'].map((level, i) => (
        grouped[level]?.length > 0 && (
          <div key={level}>
            <RoadmapSection level={level} papers={grouped[level]} index={i} />
            {i < 2 && grouped[Object.keys(grouped)[i + 1]]?.length > 0 && (
              <div className="flex justify-center my-4 ml-14">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6" style={{ background: 'rgba(201,168,76,0.2)' }} />
                  <ArrowDown size={14} className="text-gray-700" />
                </div>
              </div>
            )}
          </div>
        )
      ))}

      {/* Footer tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-xl p-4 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-xs text-gray-600">
          📌 Start from <span className="text-green-400">01 Start Here</span> and work your way down. Click PDF to read any paper.
        </p>
      </motion.div>
    </div>
  )
}