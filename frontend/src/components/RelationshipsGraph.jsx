import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DIFFICULTY_COLORS = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
}

export default function RelationshipsGraph({ papers }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [edges, setEdges] = useState([])
  const [nodes, setNodes] = useState([])
  const [svgWidth, setSvgWidth] = useState(800)

  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current?.parentElement) {
        setSvgWidth(svgRef.current.parentElement.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!papers || papers.length === 0) return
    const topN = papers.slice(0, 8)
    const nodeSpacing = svgWidth / (topN.length + 1)
    const nodeY = 220

    const builtNodes = topN.map((p, i) => ({
      id: i,
      x: nodeSpacing * (i + 1),
      y: nodeY,
      paper: p,
      difficulty: p.difficulty || 'intermediate',
    }))

    const builtEdges = []
    for (let i = 0; i < topN.length; i++) {
      for (let j = i + 1; j < topN.length; j++) {
        const a = (topN[i].main_concepts || []).map(c => c.toLowerCase())
        const b = (topN[j].main_concepts || []).map(c => c.toLowerCase())
        const shared = a.filter(c => b.includes(c))
        if (shared.length > 0) {
          builtEdges.push({
            source: i,
            target: j,
            label: shared.length >= 2 ? 'Builds on' : 'Compares to',
            strength: shared.length,
          })
        }
      }
    }

    setNodes(builtNodes)
    setEdges(builtEdges)
  }, [papers, svgWidth])

  const getArcPath = (s, t) => {
    const src = nodes[s]
    const tgt = nodes[t]
    if (!src || !tgt) return ''
    const mx = (src.x + tgt.x) / 2
    const my = src.y - Math.abs(tgt.x - src.x) * 0.38
    return `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`
  }

  const getMidpoint = (s, t) => {
    const src = nodes[s]
    const tgt = nodes[t]
    if (!src || !tgt) return { x: 0, y: 0 }
    const mx = (src.x + tgt.x) / 2
    const my = src.y - Math.abs(tgt.x - src.x) * 0.38
    return {
      x: (src.x + 2 * mx + tgt.x) / 4,
      y: (src.y + 2 * my + tgt.y) / 4,
    }
  }

  const connectedToSelected = selectedNode !== null
    ? new Set(edges
        .filter(e => e.source === selectedNode || e.target === selectedNode)
        .flatMap(e => [e.source, e.target]))
    : null

  if (!papers || papers.length === 0) return (
    <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
      Search a topic to see paper relationships
    </div>
  )

  const topN = papers.slice(0, 8)

  return (
    <div className="w-full">
      {/* SVG */}
      <div className="relative w-full rounded-2xl overflow-visible"
        style={{ background: 'rgba(2,8,20,0.6)', border: '1px solid rgba(201,168,76,0.1)', height: 360 }}>
        <svg ref={svgRef} width="100%" height="360">
          {/* Edges */}
          {edges.map((edge, i) => {
            const path = getArcPath(edge.source, edge.target)
            const mid = getMidpoint(edge.source, edge.target)
            const isHighlighted = selectedNode === null ||
              connectedToSelected?.has(edge.source) && connectedToSelected?.has(edge.target)
            return (
              <g key={i}>
                <motion.path
                  d={path}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: isHighlighted ? (edge.label === 'Builds on' ? 0.65 : 0.35) : 0.06,
                  }}
                  transition={{ duration: 1.2, delay: i * 0.07, ease: 'easeInOut' }}
                  stroke={edge.label === 'Builds on' ? '#c9a84c' : '#94a3b8'}
                  strokeWidth={edge.label === 'Builds on' ? 1.5 : 1}
                  strokeDasharray={edge.label === 'Compares to' ? '5,4' : 'none'}
                />
                {isHighlighted && (
                  <motion.text
                    x={mid.x} y={mid.y - 7}
                    textAnchor="middle"
                    fill={edge.label === 'Builds on' ? 'rgba(201,168,76,0.65)' : 'rgba(148,163,184,0.5)'}
                    fontSize="9" fontFamily="monospace"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                  >
                    {edge.label}
                  </motion.text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const color = DIFFICULTY_COLORS[node.difficulty] || '#f59e0b'
            const isSelected = selectedNode === node.id
            const isConnected = connectedToSelected?.has(node.id)
            const isDimmed = selectedNode !== null && !isSelected && !isConnected

            return (
              <g key={node.id} style={{ cursor: 'pointer' }}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                onMouseEnter={() => setTooltip(node)}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Pulse */}
                {isSelected && (
                  <motion.circle cx={node.x} cy={node.y} r={34} fill="none"
                    stroke={color} strokeWidth={1.5}
                    initial={{ opacity: 0.9, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.7 }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
                  />
                )}
                {/* Outer circle */}
                <motion.circle cx={node.x} cy={node.y}
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: isSelected ? 28 : 24, opacity: isDimmed ? 0.15 : 1 }}
                  transition={{ duration: 0.4, delay: node.id * 0.06 }}
                  fill={`${color}15`}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Inner */}
                <motion.circle cx={node.x} cy={node.y} r={16}
                  fill="#020d1a"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.2 : 1 }}
                  transition={{ duration: 0.3 }}
                />
                {/* Text */}
                <motion.text x={node.x} y={node.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.15 : 1 }}
                  transition={{ delay: 0.4 + node.id * 0.06 }}
                >
                  #{node.id + 1}
                </motion.text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key={tooltip.id}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none rounded-xl px-3 py-2.5"
              style={{
                left: Math.min(tooltip.x + 20, svgWidth - 240),
                top: Math.max(tooltip.y - 100, 8),
                background: 'rgba(4,13,26,0.98)',
                border: '1px solid rgba(201,168,76,0.3)',
                maxWidth: 230,
                zIndex: 50,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <p className="text-xs font-mono text-gold-500 mb-1">#{tooltip.id + 1}</p>
              <p className="text-xs text-white font-medium leading-snug mb-1.5">{tooltip.paper.title}</p>
              {tooltip.paper.one_line_summary && (
                <p className="text-xs text-gray-500 leading-snug mb-2">{tooltip.paper.one_line_summary}</p>
              )}
              <span className="text-xs px-2 py-0.5 rounded font-mono"
                style={{
                  background: `${DIFFICULTY_COLORS[tooltip.difficulty]}18`,
                  color: DIFFICULTY_COLORS[tooltip.difficulty],
                }}>
                {tooltip.difficulty}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected detail panel */}
      <AnimatePresence>
        {selectedNode !== null && nodes[selectedNode] && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-4 rounded-2xl p-5"
            style={{ background: 'rgba(7,20,40,0.9)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-xs font-mono text-gold-500">#{selectedNode + 1}</span>
                <h3 className="text-white font-semibold text-sm mt-0.5 leading-snug">
                  {nodes[selectedNode].paper.title}
                </h3>
              </div>
              <button onClick={() => setSelectedNode(null)}
                className="text-gray-600 hover:text-gray-300 text-lg leading-none flex-shrink-0">✕</button>
            </div>
            {nodes[selectedNode].paper.one_line_summary && (
              <p className="text-gold-400 text-xs italic mb-3">{nodes[selectedNode].paper.one_line_summary}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['problem', 'method'].map(key => nodes[selectedNode].paper[key] && (
                <div key={key} className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-gold-500 uppercase font-mono font-bold mb-1">{key}</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{nodes[selectedNode].paper[key]}</p>
                </div>
              ))}
            </div>
            {edges.filter(e => e.source === selectedNode || e.target === selectedNode).length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-mono uppercase mb-2">Connected papers</p>
                <div className="flex flex-wrap gap-2">
                  {edges
                    .filter(e => e.source === selectedNode || e.target === selectedNode)
                    .map((e, i) => {
                      const otherId = e.source === selectedNode ? e.target : e.source
                      return (
                        <motion.button key={i}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => setSelectedNode(otherId)}
                          className="text-xs px-2.5 py-1 rounded-full font-mono"
                          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                          #{otherId + 1} · {e.label}
                        </motion.button>
                      )
                    })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {topN.map((p, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedNode(selectedNode === i ? null : i)}
            whileHover={{ scale: 1.01 }}
            className="flex items-start gap-2 p-2.5 rounded-xl cursor-pointer transition-all"
            style={{
              background: selectedNode === i ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedNode === i ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.05)'}`,
            }}
          >
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
              #{i + 1}
            </span>
            <p className="text-xs text-gray-400 leading-snug line-clamp-2">{p.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Arc legend */}
      <div className="flex flex-wrap gap-6 mt-5 px-1">
        <div className="flex items-center gap-2">
          <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#c9a84c" strokeWidth="1.5" /></svg>
          <span className="text-xs text-gray-600 font-mono">Builds on</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,4" /></svg>
          <span className="text-xs text-gray-600 font-mono">Compares to</span>
        </div>
        <div className="flex items-center gap-4 ml-2">
          {Object.entries(DIFFICULTY_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs text-gray-600 font-mono capitalize">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}