import { defaultSchema } from 'rehype-sanitize'
import type { Options as SanitizeSchema } from 'rehype-sanitize'

/**
 * Extracts the language of a fenced code block from the class list that
 * remark/rehype put on the `<code>` element (`hljs language-mermaid`).
 */
export function codeLanguage(className: string | undefined): string | null {
  if (!className) return null
  const match = /(?:^|\s)language-([\w-]+)/.exec(className)
  return match?.[1]?.toLowerCase() ?? null
}

/** Lazy mermaid diagram source, or null for every other code fence. */
export function mermaidSource(className: string | undefined, code: string): string | null {
  return codeLanguage(className) === 'mermaid' ? code.trim() : null
}

const attributes = defaultSchema.attributes ?? {}

const textAlign = /^text-align:\s*(left|center|right);?$/

/**
 * Sanitizer schema for vault markdown.
 *
 * The default schema already allows the report-style HTML that real vaults
 * use (`<a id>`, `<details>`, `<kbd>`, `<sub>`, task lists, footnotes). We only
 * widen it where the app needs it:
 * - keep table column alignment, which remark-gfm emits as inline `style`;
 * - keep image `loading`; and
 * - disable id/name clobbering so explicit anchors such as
 *   `<a id="s-abstract"></a>` remain reachable from `#s-abstract` links.
 *
 * Scripts, styles, iframes, event handlers and unknown protocols stay blocked.
 */
export const markdownSchema: SanitizeSchema = {
  ...defaultSchema,
  clobber: [],
  attributes: {
    ...attributes,
    td: [...(attributes.td ?? []), ['style', textAlign]],
    th: [...(attributes.th ?? []), ['style', textAlign]],
    img: [...(attributes.img ?? []), 'loading'],
  },
}

const htmlTagNames = [
  ...(defaultSchema.tagNames ?? []),
  'address',
  'article',
  'aside',
  'figcaption',
  'figure',
  'footer',
  'header',
  'hgroup',
  'main',
  'mark',
  'nav',
  'search',
  'time',
  'wbr',
]

/**
 * Sanitizer schema for standalone HTML documents. It starts from the markdown
 * schema and only adds the semantic HTML5 containers that a full page uses.
 * Scripts, styles, iframes, forms and event handlers remain blocked.
 */
export const htmlSchema: SanitizeSchema = {
  ...markdownSchema,
  tagNames: [...new Set(htmlTagNames)],
}
