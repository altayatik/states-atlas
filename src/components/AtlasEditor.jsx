import { useMemo, useState } from 'react'
import { Edit3, Search } from 'lucide-react'
import { STATUSES, STATUS_LABELS } from '../data/states'
import { formatStatus } from '../utils/formatters'

export function AtlasEditor({ states, onBack, onEdit }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredStates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return states.filter((state) => {
      const matchesQuery = !normalizedQuery
        || state.name.toLowerCase().includes(normalizedQuery)
        || state.code.toLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'all' || state.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [query, states, statusFilter])

  return (
    <main className="editor-page">
      <header className="editor-header">
        <div>
          <p className="eyebrow">Private dashboard</p>
          <h1>Road Atlas Editor</h1>
          <p>Update state memories, statuses, badges, city lists, and park lists.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={onBack}>
          Back to public atlas
        </button>
      </header>

      <section className="editor-tools" aria-label="Editor filters">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search states</span>
          <input
            placeholder="Search states"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="editor-state-grid" aria-label="State editor list">
        {filteredStates.map((state) => (
          <article className="editor-state-card" key={state.code}>
            <div className="editor-state-card__main">
              <span>{state.code}</span>
              <div>
                <h2>{state.name}</h2>
                <p>{formatStatus(state.status)}</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Year</dt>
                <dd>{state.firstVisitedYear || '-'}</dd>
              </div>
              <div>
                <dt>Vibe</dt>
                <dd>{state.vibeRating || '-'}/5</dd>
              </div>
              <div>
                <dt>Mention</dt>
                <dd>{state.honorableMention ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Cities</dt>
                <dd>{state.citiesVisited.length}</dd>
              </div>
              <div>
                <dt>Parks</dt>
                <dd>{state.parksVisited.length}</dd>
              </div>
            </dl>
            <button className="button button--secondary" type="button" onClick={() => onEdit(state.code)}>
              <Edit3 size={16} aria-hidden="true" />
              Edit
            </button>
          </article>
        ))}
      </section>
    </main>
  )
}
