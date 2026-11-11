import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import { Link } from 'react-router-dom'
import { docHref, resolveDocHref } from '../lib/paths'
import { codeLanguage, markdownSchema } from '../lib/markdown'
import { MermaidChart } from './MermaidChart'

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('')
}

export function Markdown({ body, sourcePath }: { body: string; sourcePath: string }) {
  const components: Components = {
    a({ href, children, node: _node, ...props }) {
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
    pre({ children, node: _node, ...props }) {
      const child = Children.toArray(children)[0]
      if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
        const { className, children: codeChildren } = child.props
        if (codeLanguage(className) === 'mermaid') {
          return <MermaidChart chart={textOf(codeChildren).trim()} />
        }
      }
      return <pre {...props}>{children}</pre>
    },
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          // Raw HTML first so hand-written anchors/tables/details survive,
          // then sanitize, then add heading ids and syntax highlighting.
          rehypeRaw,
          [rehypeSanitize, markdownSchema],
          rehypeSlug,
          rehypeHighlight,
        ]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
