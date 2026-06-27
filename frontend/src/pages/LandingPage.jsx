import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion'
import { Search, BookOpen, GitBranch, MessageSquare, Map } from 'lucide-react'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Paper Cards',
    desc: 'Problem, method, key results, and main contribution. Extracted from every paper and laid out clearly.',
  },
  {
    icon: MessageSquare,
    title: 'Ask AI',
    desc: 'Ask any question about the research. The AI answers using actual paper content as context.',
  },
  {
    icon: GitBranch,
    title: 'Relationships',
    desc: 'See which papers build on each other, compare methods, or share key concepts, visualised as a graph.',
  },
  {
    icon: Map,
    title: 'Reading Path',
    desc: 'Papers sorted Beginner → Advanced so you always know where to start and what to read next.',
  },
]

const EXAMPLE_TOPICS = [
  'transformer architecture', 'diffusion models', 'reinforcement learning',
  'graph neural networks', 'retrieval augmented generation', 'attention mechanism',
  'contrastive learning', 'vision transformers', 'RLHF', 'LLM fine-tuning',
  'neural architecture search', 'prompt engineering',
]

function FloatingChip({ label, initialX, initialY, cursorX, cursorY, onClick }) {
  const x = useMotionValue(initialX)
  const y = useMotionValue(initialY)
  const vx = useRef((Math.random() - 0.5) * 0.4)
  const vy = useRef(-Math.random() * 0.5 - 0.1)
  const animRef = useRef(null)
  const posRef = useRef({ x: initialX, y: initialY })

  useEffect(() => {
    const tick = () => {
      const cx = cursorX.current ?? -999
      const cy = cursorY.current ?? -999
      let px = posRef.current.x
      let py = posRef.current.y

      const dx = px - cx
      const dy = py - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 130 && dist > 0) {
        const force = (130 - dist) / 130 * 0.9
        vx.current += (dx / dist) * force
        vy.current += (dy / dist) * force
      }

      vy.current -= 0.007
      vx.current *= 0.97
      vy.current *= 0.97

      px += vx.current
      py += vy.current

      const W = window.innerWidth
      const H = window.innerHeight
      if (px < -120) px = W + 60
      if (px > W + 120) px = -60
      if (py < -60) py = H + 40
      if (py > H + 60) py = -40

      posRef.current = { x: px, y: py }
      x.set(px)
      y.set(py)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(label)}
      className="px-3 py-1.5 rounded-full text-xs font-mono cursor-pointer select-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x,
        y,
        background: 'rgba(7,20,40,0.75)',
        border: '1px solid rgba(201,168,76,0.2)',
        color: 'rgba(201,168,76,0.6)',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
      }}
    >
      {label}
    </motion.button>
  )
}

function PopCard({ feature, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const smoothRX = useSpring(rotateX, { stiffness: 400, damping: 30 })
  const smoothRY = useSpring(rotateY, { stiffness: 400, damping: 30 })

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    rotateX.set(-ny * 16)
    rotateY.set(nx * 16)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: smoothRX,
        rotateY: smoothRY,
        transformStyle: 'preserve-3d',
        perspective: 600,
      }}
      className="relative rounded-2xl p-6 cursor-default h-full"
      whileHover={{ boxShadow: '0 25px 60px rgba(201,168,76,0.18), 0 0 0 1px rgba(201,168,76,0.12)' }}
    >
      <div className="absolute inset-0 rounded-2xl"
        style={{
          background: 'rgba(7,20,40,0.7)',
          border: '1px solid rgba(201,168,76,0.12)',
          backdropFilter: 'blur(16px)',
        }} />
      <motion.div
        style={{ transform: 'translateZ(40px)', transformStyle: 'preserve-3d' }}
        className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        whileHover={{ scale: 1.2 }}
      >
        <div className="absolute inset-0 rounded-xl"
          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }} />
        <feature.icon size={20} className="text-gold-400 relative z-10" />
      </motion.div>
      <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
        <h3 className="font-display font-semibold text-white mb-2 text-lg">{feature.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
      </div>
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.06), transparent 60%)' }} />
    </motion.div>
  )
}

export default function LandingPage() {
  const [topic, setTopic] = useState('')
  const [focused, setFocused] = useState(false)
  const [chips, setChips] = useState([])
  const navigate = useNavigate()
  const cursorX = useRef(-999)
  const cursorY = useRef(-999)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 20 })
  const titleX = useTransform(smoothX, [-1, 1], [-15, 15])
  const titleY = useTransform(smoothY, [-1, 1], [-10, 10])
  const subtitleX = useTransform(smoothX, [-1, 1], [-7, 7])
  const subtitleY = useTransform(smoothY, [-1, 1], [-5, 5])

  useEffect(() => {
    const spawned = EXAMPLE_TOPICS.map((label, i) => ({
      id: i,
      label,
      initialX: Math.random() * window.innerWidth,
      initialY: Math.random() * window.innerHeight,
    }))
    setChips(spawned)
  }, [])

  useEffect(() => {
    const handleMove = (e) => {
      cursorX.current = e.clientX
      cursorY.current = e.clientY
      mouseX.set((e.clientX / window.innerWidth) * 2 - 1)
      mouseY.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const handleSearch = (t) => {
    const q = (t || topic).trim()
    if (!q) return
    navigate(`/research?topic=${encodeURIComponent(q)}`)
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: '#020d1a' }}>

      {/* Floating chips — behind hero */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {chips.map(chip => (
          <FloatingChip
            key={chip.id}
            label={chip.label}
            initialX={chip.initialX}
            initialY={chip.initialY}
            cursorX={cursorX}
            cursorY={cursorY}
            onClick={handleSearch}
          />
        ))}
      </div>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {[
          { x: 15, y: 25, c: 'rgba(201,168,76,0.8)', s: 500, d: 10 },
          { x: 80, y: 15, c: 'rgba(59,130,246,0.6)', s: 400, d: 13 },
          { x: 65, y: 65, c: 'rgba(139,92,246,0.5)', s: 350, d: 8 },
          { x: 25, y: 75, c: 'rgba(201,168,76,0.4)', s: 300, d: 11 },
        ].map((orb, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              left: `${orb.x}%`, top: `${orb.y}%`,
              width: orb.s, height: orb.s,
              background: orb.c,
              filter: 'blur(100px)',
              opacity: 0.1,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ y: [0, -40, 0, 30, 0], x: [0, 20, -15, 10, 0], scale: [1, 1.1, 0.9, 1.05, 1] }}
            transition={{ duration: orb.d, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          />
        ))}
      </div>

      {/* Hero */}
      <section
        className="relative flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-20"
        style={{ zIndex: 15 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 px-4 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}
        >
          ✦ ML Research Intelligence
        </motion.div>

        <motion.h1
          style={{ x: titleX, y: titleY }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="font-display text-center font-bold leading-tight mb-6 select-none"
        >
          <span className="text-white block" style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>Research</span>
          <span className="text-gradient-gold block" style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>Made Easy</span>
        </motion.h1>

        <motion.p
          style={{ x: subtitleX, y: subtitleY }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-center text-gray-400 text-lg mb-12 max-w-xl leading-relaxed"
        >
          Enter a topic. ArXiv pulls the papers. The AI reads, ranks, and maps
          the entire field, so you know exactly where to start.
        </motion.p>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          className="w-full max-w-2xl mb-4"
        >
          <div
            className="flex items-center rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: 'rgba(7,20,40,0.95)',
              border: `1px solid ${focused ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.2)'}`,
              boxShadow: focused
                ? '0 0 80px rgba(201,168,76,0.25), 0 0 0 1px rgba(201,168,76,0.1)'
                : '0 0 30px rgba(201,168,76,0.07)',
            }}
          >
            <Search className="ml-5 text-gold-600 flex-shrink-0" size={20} />
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. transformer architecture attention mechanism"
              className="flex-1 bg-transparent px-4 py-4 text-white placeholder-gray-600 outline-none text-base"
            />
            <motion.button
              onClick={() => handleSearch()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-gold m-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Explore →
            </motion.button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-gray-700 font-mono"
        >
          or click any floating keyword ↑
        </motion.p>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-gray-700 font-mono tracking-widest uppercase">scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-8 bg-gradient-to-b from-gold-600 to-transparent"
          />
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative px-6 pb-32" style={{ zIndex: 10 }}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs font-mono uppercase tracking-widest text-gray-600 mb-12"
        >
          What you get
        </motion.p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          style={{ perspective: '1000px' }}>
          {FEATURES.map((f, i) => (
            <PopCard key={f.title} feature={f} index={i} />
          ))}
        </div>

        {/* Pipeline */}
        <div className="max-w-3xl mx-auto mt-24 relative">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute top-5 left-[12.5%] right-[12.5%] h-px origin-left"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), rgba(201,168,76,0.4), transparent)' }}
          />
          <div className="grid grid-cols-4 gap-0">
            {[
              { n: '01', label: 'Find Papers', sub: 'Search ArXiv' },
              { n: '02', label: 'Rank Papers', sub: 'By relevance' },
              { n: '03', label: 'Extract Insights', sub: 'Problem · Method · Results' },
              { n: '04', label: 'Map Research', sub: 'Full landscape' },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="flex flex-col items-center text-center px-2"
              >
                <motion.div
                  whileHover={{ scale: 1.15, y: -4 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3 relative z-10"
                  style={{ background: '#020d1a', border: '1px solid rgba(201,168,76,0.4)' }}
                >
                  <span className="text-xs font-mono font-bold text-gold-500">{step.n}</span>
                </motion.div>
                <p className="text-white text-sm font-semibold mb-1">{step.label}</p>
                <p className="text-gray-600 text-xs font-mono">{step.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}