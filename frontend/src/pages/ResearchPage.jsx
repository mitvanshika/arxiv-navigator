import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  Search, Loader2, BookOpen, GitBranch,
  MessageSquare, Map, AlertCircle, Clock, X,
  ChevronRight, Lightbulb, Wrench, BarChart2,
  Zap, Brain, Calendar, Users, ExternalLink
} from 'lucide-react'
import Roadmap from '../components/Roadmap'
import ChatInterface from '../components/ChatInterface'
import KnowledgeGraph from '../components/KnowledgeGraph'

const DIFFICULTY_COLORS = {
  beginner: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' },
  intermediate: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
}

const TABS = [
  { id: 'papers', label: 'Papers', icon: BookOpen },
  { id: 'chat', label: 'Ask AI', icon: MessageSquare },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'graph', label: 'Graph', icon: GitBranch },
]

function TopicOverviewCard({ overview, topic }) {
  if (!overview) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 mb-6"
      style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-gold-400" />
        <span className="text-xs font-mono uppercase tracking-widest text-gold-500">What is {topic}?</span>
      </div>
      <p className="text-white text-sm leading-relaxed mb-3">{overview.what_is_it}</p>
      {overview.analogy && (
        <p className="text-gray-400 text-xs italic mb-4">💡 {overview.analogy}</p>
      )}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-xs text-gold-500 font-semibold mb-1">Core Problem</p>
          <p className="text-xs text-gray-300 leading-relaxed">{overview.core_problem}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <p className="text-xs text-gold-500 font-semibold mb-1">Why it matters</p>
          <p className="text-xs text-gray-300 leading-relaxed">{overview.why_it_matters}</p>
        </div>
      </div>
      {overview.key_concepts?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {overview.key_concepts.map(c => (
            <span key={c} className="px-2.5 py-1 rounded-full text-xs font-mono"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
              {c}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function PaperListItem({ paper, selected, onClick, index }) {
  const difficulty = paper.difficulty || 'intermediate'
  const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.intermediate

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="p-3 rounded-xl cursor-pointer transition-all duration-200 mb-2"
      style={{
        background: selected ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 font-mono"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
          {difficulty}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium leading-snug line-clamp-2 ${selected ? 'text-gold-300' : 'text-gray-200'}`}>
            {paper.title}
          </p>
          {paper.one_line_summary && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{paper.one_line_summary}</p>
          )}
        </div>
        {selected && <ChevronRight size={12} className="text-gold-400 flex-shrink-0 mt-1" />}
      </div>
    </motion.div>
  )
}

function PaperDetail({ paper }) {
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
      <div className="mb-5">
        <span className="text-xs px-2.5 py-1 rounded-full font-mono mb-3 inline-block"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
          {difficulty}
        </span>
        <h2 className="font-display text-xl font-bold text-white leading-snug mb-2">
          {paper.title}
        </h2>
        {paper.one_line_summary && (
          <p className="text-gold-400 text-sm italic">{paper.one_line_summary}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
          {paper.published && (
            <span className="flex items-center gap-1"><Calendar size={11} />{paper.published}</span>
          )}
          {paper.authors?.length > 0 && (
            <span className="flex items-center gap-1"><Users size={11} />{paper.authors.slice(0, 2).join(', ')}</span>
          )}
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-gold-500 hover:text-gold-300 transition-colors">
              <ExternalLink size={11} /> PDF
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {sections.map(s => paper[s.key] && (
          <div key={s.key} className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={13} style={{ color: s.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.color }}>
                {s.label}
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{paper[s.key]}</p>
          </div>
        ))}
      </div>

      {!paper.problem && (
        <div className="rounded-xl p-4 mb-5"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-amber-400 text-xs">
            ⏳ This paper hasn't been enriched yet — detailed breakdown will appear after enrichment completes.
          </p>
          <p className="text-gray-500 text-xs mt-2 leading-relaxed">{paper.summary?.slice(0, 300)}...</p>
        </div>
      )}

      {paper.main_concepts?.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-mono">Key Concepts</p>
          <div className="flex flex-wrap gap-2">
            {paper.main_concepts.map(c => (
              <span key={c} className="px-2.5 py-1 rounded-full text-xs font-mono text-gray-400"
                style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function ResearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialTopic = params.get('topic') || ''

  const [inputTopic, setInputTopic] = useState(initialTopic)
  const [topic, setTopic] = useState(initialTopic)
  const [papers, setPapers] = useState([])
  const [filteredPapers, setFilteredPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [overview, setOverview] = useState(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [activeTab, setActiveTab] = useState('papers')
  const [status, setStatus] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [enriched, setEnriched] = useState(false)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('arxiv_history') || '[]')
    } catch { return [] }
  })
  const [showHistory, setShowHistory] = useState(false)

  const STEPS = [
    'Fetching papers from ArXiv',
    'Generating topic overview',
    'Extracting paper details',
    'Building knowledge graph',
  ]

  useEffect(() => {
    if (initialTopic) runPipeline(initialTopic)
  }, [])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredPapers(papers)
    } else {
      setFilteredPapers(papers.filter(p => p.difficulty === filter))
    }
    setSelectedPaper(null)
  }, [filter, papers])

  const runPipeline = async (t) => {
    const q = (t || inputTopic).trim()
    if (!q) return
    setTopic(q)
    setStatus('loading')
    setError(null)
    setPapers([])
    setFilteredPapers([])
    setSelectedPaper(null)
    setOverview(null)
    setGraphData({ nodes: [], edges: [] })
    setEnriched(false)
    setCurrentStep(0)

    try {
      setCurrentStep(0)
      const fetchRes = await axios.post('/api/search', { topic: q, max_papers: 12 })
      setPapers(fetchRes.data.papers)
      setFilteredPapers(fetchRes.data.papers)
      setSelectedPaper(fetchRes.data.papers[0])

      setCurrentStep(1)
      try {
        const overviewRes = await axios.post('/api/topic-overview', { topic: q })
        setOverview(overviewRes.data)
      } catch { }

      setCurrentStep(2)
      try {
        const enrichRes = await axios.post('/api/enrich', { topic: q })
        setPapers(enrichRes.data.papers)
        setFilteredPapers(enrichRes.data.papers)
        setSelectedPaper(enrichRes.data.papers[0])
        setEnriched(true)
      } catch { }

      setCurrentStep(3)
      try {
        const graphRes = await axios.get(`/api/graph/${encodeURIComponent(q)}`)
        setGraphData(graphRes.data)
      } catch { }

      setStatus('ready')
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      setStatus('error')
    }
  }

  const saveToHistory = (q) => {
    const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 8)
    setSearchHistory(updated)
    localStorage.setItem('arxiv_history', JSON.stringify(updated))
  }

  const handleSearch = () => {
    if (!inputTopic.trim()) return
    saveToHistory(inputTopic.trim())
    navigate(`/research?topic=${encodeURIComponent(inputTopic.trim())}`)
    runPipeline(inputTopic.trim())
  }

  return (
    <div className="relative z-10 min-h-screen pt-20 pb-6 px-4 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">

        <div className="relative flex gap-3 mb-6 max-w-2xl">
          <div className="flex-1 flex items-center rounded-xl overflow-hidden"
            style={{ background: 'rgba(7,20,40,0.9)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <Search className="ml-4 text-gold-600 flex-shrink-0" size={16} />
            <input
              value={inputTopic}
              onChange={e => setInputTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 300)}
              placeholder="Search ML topic..."
              className="flex-1 bg-transparent px-3 py-3 text-white placeholder-gray-600 outline-none text-sm"
            />
          </div>
          <button onClick={handleSearch} disabled={status === 'loading'}
            className="btn-gold px-5 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
            {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Go
          </button>

          {/* Search history dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-xl overflow-hidden z-50"
              style={{ background: 'rgba(7,20,40,0.98)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-gray-600 font-mono uppercase tracking-wider">Recent searches</span>
                <button onClick={() => { setSearchHistory([]); localStorage.removeItem('arxiv_history') }}
                  className="text-xs text-gray-700 hover:text-red-400 transition-colors">
                  Clear
                </button>
              </div>
              {searchHistory.map((h, i) => (
                <button key={i} onClick={() => { setInputTopic(h); setShowHistory(false); saveToHistory(h); navigate(`/research?topic=${encodeURIComponent(h)}`); runPipeline(h) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                  <Clock size={12} className="text-gray-600 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{h}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {status === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="card-glass rounded-2xl p-6 mb-6 max-w-sm">
              <p className="text-gold-400 font-display font-semibold mb-4">Navigating research landscape…</p>
              <div className="space-y-3">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < currentStep ? 'bg-green-500/20 border border-green-500/40'
                      : i === currentStep ? 'bg-gold-500/20 border border-gold-500/40'
                      : 'bg-navy-800 border border-navy-700'
                    }`}>
                      {i < currentStep ? <span className="text-green-400 text-xs">✓</span>
                        : i === currentStep ? <Loader2 size={10} className="text-gold-400 animate-spin" />
                        : <span className="text-gray-700 text-xs">·</span>}
                    </div>
                    <span className={`text-sm ${
                      i < currentStep ? 'text-green-400' : i === currentStep ? 'text-gold-300' : 'text-gray-700'
                    }`}>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <div>
              <p className="text-red-400 text-sm font-medium">Something went wrong</p>
              <p className="text-red-400/70 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {papers.length > 0 && (
          <>
            <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit"
              style={{ background: 'rgba(7,20,40,0.8)', border: '1px solid rgba(201,168,76,0.1)' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id ? 'text-navy-950 bg-gold-400' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  <tab.icon size={14} />{tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1">

                {activeTab === 'papers' && (
                  <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
                    <div className="w-80 flex-shrink-0 flex flex-col">
                      <div className="flex gap-1 mb-3 p-1 rounded-lg"
                        style={{ background: 'rgba(7,20,40,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {['all', 'beginner', 'intermediate', 'advanced'].map(f => (
                          <button key={f} onClick={() => setFilter(f)}
                            className={`flex-1 py-1 rounded text-xs font-medium capitalize transition-all ${
                              filter === f ? 'bg-gold-500 text-navy-950' : 'text-gray-500 hover:text-gray-300'
                            }`}>
                            {f}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mb-2 px-1">{filteredPapers.length} papers</p>
                      <div className="flex-1 overflow-y-auto pr-1">
                        {filteredPapers.map((paper, i) => (
                          <PaperListItem
                            key={paper.id || i}
                            paper={paper}
                            index={i}
                            selected={selectedPaper?.title === paper.title}
                            onClick={() => setSelectedPaper(paper)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 card-glass rounded-2xl p-6 overflow-hidden flex flex-col">
                      {selectedPaper && (
                        <div className="mb-4 pb-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                          <button onClick={() => setSelectedPaper(null)}
                            className="text-xs text-gold-500 hover:text-gold-300 transition-colors flex items-center gap-1">
                            ← Back to topic overview
                          </button>
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        {selectedPaper
                          ? <PaperDetail paper={selectedPaper} />
                          : overview
                            ? <TopicOverviewCard overview={overview} topic={topic} />
                            : <div className="text-center text-gray-600 text-sm mt-20">Select a paper</div>
                        }
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="max-w-2xl">
                    <ChatInterface topic={topic} />
                  </div>
                )}

                {activeTab === 'roadmap' && (
                  <Roadmap papers={papers} overview={overview} topic={topic} />
                )}

                {activeTab === 'graph' && (
                  graphData.nodes.length > 0
                    ? <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} />
                    : <div className="card-glass rounded-2xl p-12 text-center text-gray-600 text-sm">
                        Graph will appear after enrichment completes.
                      </div>
                )}

              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}