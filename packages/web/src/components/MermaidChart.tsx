import { useEffect, useId, useRef, useState } from 'react'
import { useTheme } from '../theme'

type Mermaid = (typeof import('mermaid'))['default']

// Mermaid plus its layout engines are heavy: keep the import behind a dynamic
// chunk so documents without diagrams never pay for it.
let mermaidLoad: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  mermaidLoad ??= import('mermaid').then((module) => module.default)
  return mermaidLoad
}

/**
 * Renders a ` ```mermaid ` fence with mermaid. The SVG is produced locally by
 * the bundled library (no network) and follows the app theme.
 */
export function MermaidChart({ chart }: { chart: string }) {
  const { theme } = useTheme()
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const reactId = useId()
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    let cancelled = false
    setError(null)

    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          fontFamily: 'inherit',
          theme: theme === 'light' ? 'default' : 'dark',
        })
        return mermaid.render(renderId, chart)
      })
      .then(({ svg }) => {
        if (!cancelled && host.current) host.current.innerHTML = svg
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    return () => {
      cancelled = true
    }
  }, [chart, theme, renderId])

  if (error) {
    return (
      <div className="mermaid-error" role="alert">
        <p>Mermaid diagram could not be rendered: {error}</p>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    )
  }

  return <div ref={host} className="mermaid" role="img" aria-label="Mermaid diagram" />
}
