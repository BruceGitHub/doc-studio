import { Children, Fragment, isValidElement, useMemo, type ReactNode } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { Link } from 'react-router-dom'
import { parseFragment } from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime'
import { unified } from 'unified'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import { docHref, resolveDocHref } from '../lib/paths'
import { codeLanguage, htmlSchema } from '../lib/markdown'
import { MermaidChart } from './MermaidChart'

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

const processor = unified()
  .use(rehypeSanitize, htmlSchema)
  .use(rehypeSlug)
  .use(rehypeHighlight)

function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('')
}

/**
 * Renders a standalone `.html` document indexed by the vault. The source is
 * parsed with parse5, sanitized with the same schema as markdown, and turned
 * into React elements so links keep working inside the app.
 */
export function HtmlDocument({ body, sourcePath }: { body: string; sourcePath: string }) {
  const components = useMemo<Components>(
    () => ({
      a({ href, children, ...props }) {
        if (!href) return <span {...props}>{children}</span>

        if (href.startsWith('#')) {
          return (
            <a href={href} {...props}>
              {children}
            </a>
          )
        }

        if (!SCHEME.test(href) && !href.startsWith('//')) {
          const target = resolveDocHref(sourcePath, href)
          if (target) {
            return <Link to={docHref(target.id, target.anchor)}>{children}</Link>
          }
        }

        return (
          <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
            {children}
          </a>
        )
      },
      pre({ children, ...props }) {
        const child = Children.toArray(children)[0]
        if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
          const { className, children: codeChildren } = child.props
          if (codeLanguage(className) === 'mermaid') {
            return <MermaidChart chart={textOf(codeChildren).trim()} />
          }
        }
        return <pre {...props}>{children}</pre>
      },
    }),
    [sourcePath],
  )

  const content = useMemo(() => {
    const fragment = parseFragment(body)
    const hast = fromParse5(fragment) as Parameters<typeof processor.runSync>[0]
    return toJsxRuntime(processor.runSync(hast), {
      Fragment,
      jsx,
      jsxs,
      development: false,
      components,
    })
  }, [body, components])

  return <div className="md">{content}</div>
}
