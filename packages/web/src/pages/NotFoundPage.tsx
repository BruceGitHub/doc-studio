import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        404
      </p>
      <h1 className="mt-2 text-center text-[27px] font-semibold tracking-tight text-ink">
        This page is not in the vault
      </h1>
      <p className="mt-2 text-center text-sm text-dim">
        The document may have been renamed, deleted, or the link points at a file that does not
        exist yet.
      </p>
      <div className="mt-8">
        <EmptyState
          title="Nothing here."
          hint="Go back to the overview, or search the index for the document you were reading."
          action={
            <div className="flex items-center gap-2">
              <Link to="/" className="btn btn-primary">
                Overview
              </Link>
              <Link to="/search" className="btn">
                Search
              </Link>
            </div>
          }
        />
      </div>
    </div>
  )
}
