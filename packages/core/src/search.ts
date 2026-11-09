import type { DocRecord, SearchFilters, SearchHit } from './types.js'

interface Posting {
  score: number
}

const FIELD_WEIGHTS = {
  title: 9,
  headings: 4,
  path: 2,
  body: 1,
} as const

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1)
}

export class SearchIndex {
  private readonly postings = new Map<string, Map<string, Posting>>()
  private readonly docs: Map<string, DocRecord>

  constructor(docs: Map<string, DocRecord>) {
    this.docs = docs
    for (const doc of docs.values()) {
      this.addField(doc.id, doc.title, FIELD_WEIGHTS.title, 1)
      this.addField(
        doc.id,
        doc.headings.map((heading) => heading.text).join(' '),
        FIELD_WEIGHTS.headings,
        2,
      )
      this.addField(doc.id, `${doc.id} ${doc.path}`, FIELD_WEIGHTS.path, 1)
      this.addField(doc.id, doc.text, FIELD_WEIGHTS.body, 3)
    }
  }

  search(query: string, filters: SearchFilters = {}): SearchHit[] {
    const tokens = tokenize(query)
    if (tokens.length === 0) return []

    let scores: Map<string, number> | null = null
    const matched: string[] = []

    for (const token of tokens) {
      const local = new Map<string, number>()
      for (const [indexed, postings] of this.postings) {
        if (indexed !== token && !indexed.startsWith(token)) continue
        const boost = indexed === token ? 2 : 1
        for (const [docId, posting] of postings) {
          local.set(docId, (local.get(docId) ?? 0) + posting.score * boost)
        }
      }
      if (local.size === 0) return []

      if (scores === null) {
        scores = local
      } else {
        for (const docId of [...scores.keys()]) {
          if (!local.has(docId)) scores.delete(docId)
        }
        for (const [docId, value] of local) {
          const current = scores.get(docId)
          if (current !== undefined) scores.set(docId, current + value)
        }
      }
      matched.push(token)
    }

    if (scores === null) return []

    const limit = filters.limit ?? 30
    const hits: SearchHit[] = []
    for (const [docId, score] of scores) {
      const doc = this.docs.get(docId)
      if (!doc) continue
      if (filters.project && doc.project !== filters.project) continue
      if (filters.type && doc.type !== filters.type) continue
      if (filters.status && doc.status !== filters.status) continue
      hits.push({
        doc,
        score,
        snippet: makeSnippet(doc, matched),
        matched,
      })
    }

    hits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.doc.updatedAt.localeCompare(a.doc.updatedAt)
    })

    return hits.slice(0, limit)
  }

  private addField(docId: string, text: string, weight: number, cap: number): void {
    const counts = new Map<string, number>()
    for (const token of tokenize(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
    for (const [token, count] of counts) {
      const occurrences = Math.min(count, cap)
      const score = weight * (1 + (occurrences - 1) * 0.5)
      let postings = this.postings.get(token)
      if (!postings) {
        postings = new Map()
        this.postings.set(token, postings)
      }
      const posting = postings.get(docId)
      if (posting) posting.score += score
      else postings.set(docId, { score })
    }
  }
}

function makeSnippet(doc: DocRecord, tokens: string[]): string {
  const text = doc.text
  if (!text) return ''
  const lower = text.toLowerCase()
  let index = -1
  for (const token of tokens) {
    const found = lower.indexOf(token)
    if (found !== -1 && (index === -1 || found < index)) index = found
  }
  if (index === -1) {
    return text.length > 180 ? `${text.slice(0, 180).trim()}…` : text
  }
  const start = Math.max(0, index - 70)
  const end = Math.min(text.length, index + 150)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}
