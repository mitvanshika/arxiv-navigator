import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, RefreshCw, ChevronDown, ChevronUp, Zap, Sparkles } from 'lucide-react'
import axios from 'axios'

const generateSuggestions = (topic) => [
  `What problem does ${topic} solve?`,
  `What are the key methods used in these papers?`,
  `Which paper had the best results and why?`,
  `How do these papers compare to each other?`,
  `What are the limitations of current ${topic} approaches?`,
]

export default function ChatInterface({ topic, papers = [] }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `I've read all the papers on **${topic}**. Ask me anything — I'll self-heal if my first answer isn't good enough.`,
      sources: [],
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [healingStep, setHealingStep] = useState(null)
  const [expandedSources, setExpandedSources] = useState({})
  const [expandedAttempts, setExpandedAttempts] = useState({})
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef(null)

  const suggestions = generateSuggestions(topic)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question) => {
    const q = (question || input).trim()
    if (!q || loading) return

    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')
    setLoading(true)
    setHealingStep('thinking')

    try {
      const healTimeout = setTimeout(() => setHealingStep('healing'), 4000)
      const res = await axios.post('/api/ask', { topic, question: q })
      clearTimeout(healTimeout)
      const data = res.data

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.final_answer,
        healed: data.healed,
        totalAttempts: data.total_attempts,
        attempts: data.attempts,
        sources: data.attempts?.[data.attempts.length - 1]?.sources || [],
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not get an answer. Make sure papers are loaded first.',
        sources: [],
      }])
    } finally {
      setLoading(false)
      setHealingStep(null)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="card-glass rounded-2xl flex flex-col" style={{ height: '600px' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-sm font-medium text-gray-300">Self-Healing RAG</span>
          <span className="text-xs text-gray-600 font-mono ml-auto">{topic}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'assistant'
                  ? 'bg-gold-500/20 border border-gold-500/30'
                  : 'bg-navy-700 border border-navy-600'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot size={13} className="text-gold-400" />
                  : <User size={13} className="text-gray-400" />}
              </div>

              <div className={`max-w-[80%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))'
                      : 'rgba(13,32,64,0.8)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    color: msg.role === 'user' ? 'white' : '#e2e8f0',
                  }}
                >
                  {msg.content}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {msg.healed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 text-xs text-green-400 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                    >
                      <RefreshCw size={9} /> Self-healed
                    </motion.span>
                  )}
                  {msg.totalAttempts > 1 && (
                    <span className="text-xs text-gray-600 font-mono">{msg.totalAttempts} attempts</span>
                  )}
                </div>

                {msg.attempts?.length > 1 && (
                  <div className="w-full">
                    <button
                      onClick={() => setExpandedAttempts(p => ({ ...p, [i]: !p[i] }))}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gold-400 transition-colors"
                    >
                      <Zap size={10} />
                      {expandedAttempts[i] ? 'Hide' : 'Show'} healing steps
                      {expandedAttempts[i] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                    {expandedAttempts[i] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 space-y-2"
                      >
                        {msg.attempts.map((a, ai) => (
                          <div key={ai} className="rounded-lg p-2.5 text-xs"
                            style={{
                              background: a.was_bad ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                              border: `1px solid ${a.was_bad ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`,
                            }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-mono font-bold ${a.was_bad ? 'text-red-400' : 'text-green-400'}`}>
                                Attempt {a.attempt}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${a.was_bad ? 'text-red-400' : 'text-green-400'}`}
                                style={{ background: a.was_bad ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
                                {a.was_bad ? '✗ bad answer' : '✓ good answer'}
                              </span>
                            </div>
                            {a.query_used !== msg.attempts[0]?.query_used && (
                              <p className="text-gray-500 font-mono text-xs mb-1">
                                Reframed: "{a.query_used}"
                              </p>
                            )}
                            <p className="text-gray-400 leading-relaxed line-clamp-3">{a.answer}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {msg.sources?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedSources(p => ({ ...p, [i]: !p[i] }))}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gold-400 transition-colors"
                    >
                      {expandedSources[i] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                    </button>
                    {expandedSources[i] && (
                      <div className="mt-1 space-y-1">
                        {msg.sources.map((s, si) => (
                          <div key={si} className="text-xs text-gray-500 font-mono px-2 py-1 rounded"
                            style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
                            📄 {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggested questions — show only before first user message */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} className="text-gold-500" />
                <span className="text-xs text-gray-600 font-mono uppercase tracking-wider">Try asking</span>
              </div>
              {suggestions.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => send(s)}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gold-300 transition-all"
                  style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}
                >
                  <span className="text-gold-600 mr-2">→</span>{s}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gold-500/20 border border-gold-500/30">
              <Bot size={13} className="text-gold-400" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                style={{ background: 'rgba(13,32,64,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gold-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                {healingStep === 'healing' && (
                  <motion.span
                    key="healing"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-amber-400 font-mono"
                  >
                    <RefreshCw size={10} className="animate-spin" />
                    Reframing query and retrying...
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about these papers..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none py-2 px-3 rounded-xl"
            style={{ border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(7,20,40,0.6)' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="btn-gold p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}