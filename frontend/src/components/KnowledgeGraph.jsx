import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function KnowledgeGraph({ nodes, edges }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!nodes?.length) return

    const el = svgRef.current
    const W = el.clientWidth || 900
    const H = 600

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H)

    // Only paper nodes
    const papers = nodes.filter(n => n.type === 'paper')
    const paperEdges = edges.filter(e => e.type === 'builds_on' || e.type === 'compares_to')

    // Number each paper
    papers.forEach((p, i) => { p.num = i + 1 })

    const diffColors = {
      beginner: '#22c55e',
      intermediate: '#f59e0b',
      advanced: '#ef4444',
    }

    // D3 force simulation
    const sim = d3.forceSimulation(papers)
      .force('link', d3.forceLink(paperEdges)
        .id(d => d.id)
        .distance(180)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(50))

    // Arrow markers
    const defs = svg.append('defs')

    ;['builds_on', 'compares_to'].forEach(type => {
      const color = type === 'builds_on' ? '#c9a84c' : '#3b82f6'
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 28)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', color)
        .attr('opacity', 0.7)
    })

    // Draw edges
    const link = svg.append('g').selectAll('line')
      .data(paperEdges).join('line')
      .attr('stroke', d => d.type === 'builds_on' ? 'rgba(201,168,76,0.5)' : 'rgba(59,130,246,0.5)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.type === 'compares_to' ? '5,3' : null)
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    // Edge labels
    const linkLabel = svg.append('g').selectAll('text')
      .data(paperEdges).join('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', d => d.type === 'builds_on' ? '#c9a84c88' : '#3b82f688')
      .text(d => d.type === 'builds_on' ? 'builds on' : 'compares to')

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .style('position', 'fixed')
      .style('background', 'rgba(7,20,40,0.97)')
      .style('border', '1px solid rgba(201,168,76,0.35)')
      .style('color', '#e8e8e8')
      .style('padding', '10px 14px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '9999')
      .style('max-width', '280px')
      .style('display', 'none')
      .style('line-height', '1.6')

    // Draw nodes
    const nodeG = svg.append('g').selectAll('g')
      .data(papers).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Circle
    nodeG.append('circle')
      .attr('r', 22)
      .attr('fill', d => (diffColors[d.difficulty] || '#f59e0b') + '15')
      .attr('stroke', d => diffColors[d.difficulty] || '#f59e0b')
      .attr('stroke-width', 2)

    // Number label
    nodeG.append('text')
      .text(d => `#${d.num}`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', d => diffColors[d.difficulty] || '#f59e0b')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')

    // Short title below
    nodeG.append('text')
      .text(d => d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '38px')
      .attr('fill', '#9ca3af')
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')

    // Hover
    nodeG.on('mouseover', (e, d) => {
      const color = diffColors[d.difficulty] || '#f59e0b'
      tooltip.style('display', 'block').html(`
        <div style="color:${color};font-size:10px;font-family:monospace;margin-bottom:4px">#${d.num} · ${d.difficulty}</div>
        <div style="font-weight:600;margin-bottom:6px;color:#fff;font-size:12px">${d.label}</div>
        ${d.summary ? `<div style="color:#9ca3af;font-size:11px">${d.summary}</div>` : ''}
      `)
      d3.select(e.currentTarget).select('circle')
        .transition().duration(150).attr('r', 26)
    }).on('mousemove', e => {
      tooltip.style('left', (e.clientX + 14) + 'px').style('top', (e.clientY - 10) + 'px')
    }).on('mouseout', e => {
      tooltip.style('display', 'none')
      d3.select(e.currentTarget).select('circle')
        .transition().duration(150).attr('r', 22)
    })

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 5)

      nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      sim.stop()
      tooltip.remove()
    }
  }, [nodes, edges])

  return (
    <div className="card-glass rounded-2xl p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h3 className="text-sm font-medium text-gray-300">Paper Relationships</h3>
          <p className="text-xs text-gray-600 mt-0.5">How papers connect to each other</p>
        </div>
        <div className="flex items-center gap-5 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px bg-yellow-400 opacity-60 inline-block" />
            builds on
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-px border-t border-dashed border-blue-400 opacity-60 inline-block" />
            compares to
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Beginner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Intermediate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Advanced
          </span>
        </div>
      </div>

      {/* Paper index */}
      <div className="flex flex-wrap gap-2 mb-4 px-1">
        {nodes.filter(n => n.type === 'paper').map((p, i) => (
          <span key={p.id} className="text-xs px-2 py-1 rounded-lg font-mono"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#6b7280'
            }}>
            <span style={{ color: p.difficulty === 'beginner' ? '#22c55e' : p.difficulty === 'advanced' ? '#ef4444' : '#f59e0b' }}>
              #{i + 1}
            </span>
            {' '}{p.label.slice(0, 30)}{p.label.length > 30 ? '…' : ''}
          </span>
        ))}
      </div>

      <svg ref={svgRef} className="w-full" style={{ background: 'transparent' }} />
      <p className="text-xs text-gray-700 text-center mt-2">Drag nodes · Hover for details</p>
    </div>
  )
}