import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import { Link } from 'react-router-dom'
import { docHref, resolveDocHref } from '../lib/paths'

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

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
  }

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
