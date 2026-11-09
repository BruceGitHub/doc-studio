import { useNavigate } from 'react-router-dom'
import type { GraphDTO } from '@docstudio/core'
import { TYPE_COLOR, truncate } from '../lib/format'
import { docHref } from '../lib/paths'

const LINK_COLOR: Record<string, string> = {
  parent: 'var(--link-parent)',
  'derives-from': 'var(--link-derives-from)',
  'follow-up': 'var(--link-follow-up)',
  'depends-on': 'var(--link-depends-on)',
  implements: 'var(--link-implements)',
  'blocked-by': 'var(--link-blocked-by)',
  'reviewed-by': 'var(--link-reviewed-by)',
  tracks: 'var(--link-tracks)',
}

const WIDTH = 400
const HEIGHT = 300

export function MiniGraph({ graph }: { graph: GraphDTO }) {
  const navigate = useNavigate()
  const focus = graph.nodes.find((node) => node.id === graph.focus)
  const others = graph.nodes.filter((node) => node.id !== graph.focus)
  const radius = others.length > 8 ? 118 : 96
  const positions = new Map<string, { x: number; y: number }>()

  positions.set(graph.focus, { x: WIDTH / 2, y: HEIGHT / 2 })
  others.forEach((node, index) => {
    const angle = (index / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2
    positions.set(node.id, {
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: HEIGHT / 2 + Math.sin(angle) * radius * 0.78,
    })
  })

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full select-none"
        role="img"
        aria-label="Local document graph"
      >
        {graph.links.map((link, index) => {
          const from = positions.get(link.from)
          const to = positions.get(link.to)
          if (!from || !to) return null
          const color = LINK_COLOR[link.kind] ?? 'var(--link-default)'
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          return (
            <g key={`${link.from}-${link.to}-${index}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
              {graph.links.length <= 7 && link.kind !== 'untyped' && (
                <text
                  x={midX}
                  y={midY - 4}
                  fill="var(--graph-label)"
                  fontSize="8"
                  fontFamily="ui-monospace, monospace"
                  textAnchor="middle"
                >
                  {link.kind}
                </text>
              )}
            </g>
          )
        })}

        {graph.nodes.map((node) => {
          const position = positions.get(node.id)
          if (!position) return null
          const isFocus = node.id === graph.focus
          const color = TYPE_COLOR[node.type] ?? TYPE_COLOR.unknown
          const labelY =
            position.y > HEIGHT - 26 ? position.y - 15 : position.y + (isFocus ? 22 : 17)
          return (
            <g
              key={node.id}
              onClick={() => navigate(docHref(node.id))}
              className="cursor-pointer"
            >
              <title>{`${node.title} · ${node.type}/${node.status}`}</title>
              {isFocus && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="14"
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.35"
                />
              )}
              <circle
                cx={position.x}
                cy={position.y}
                r={isFocus ? 7 : 5}
                fill={color}
                fillOpacity={isFocus ? 1 : 0.85}
              />
              <text
                x={position.x}
                y={labelY}
                fill={isFocus ? 'var(--color-ink)' : 'var(--color-dim)'}
                fontSize={isFocus ? '10' : '9'}
                fontWeight={isFocus ? '600' : '400'}
                textAnchor="middle"
                fontFamily="Inter, ui-sans-serif, sans-serif"
              >
                {truncate(node.title, isFocus ? 28 : 19)}
              </text>
            </g>
          )
        })}
      </svg>
      {focus && others.length === 0 && (
        <p className="pb-2 text-center text-[11px] text-faint">
          No connections yet. Add a <code className="font-mono">## References</code> section.
        </p>
      )}
      <p className="pb-1 text-center text-[10px] text-faint">
        {others.length} linked {others.length === 1 ? 'document' : 'documents'} · click to open
      </p>
    </div>
  )
}
