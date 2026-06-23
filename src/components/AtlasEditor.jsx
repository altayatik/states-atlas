import { useMemo, useState } from 'react'
import { Edit3, Search } from 'lucide-react'
import { formatStatus } from '../utils/formatters'

export function AtlasEditor({ states, onBack, onEdit }) {
  const [query, setQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState('')

  const filteredStates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return states.filter((state) => {
      return !normalizedQuery
        || state.name.toLowerCase().includes(normalizedQuery)
        || state.code.toLowerCase().includes(normalizedQuery)
    })
  }, [query, states])

  const selectedState = states.find((state) => state.code === selectedCode)

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
          Choose a state to edit
          <select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)}>
            <option value="">Choose a state</option>
            {filteredStates.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name} — {formatStatus(state.status)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="editor-select-panel" aria-label="Selected state editor">
        {selectedState ? (
          <article className="editor-selected-card">
            <div>
              <p className="eyebrow">{selectedState.code}</p>
              <h2>{selectedState.name}</h2>
              <p>{formatStatus(selectedState.status)}</p>
            </div>
            <dl className="editor-summary-row">
              <div>
                <dt>Year</dt>
                <dd>{selectedState.firstVisitedYear || '-'}</dd>
              </div>
              <div>
                <dt>Vibe</dt>
                <dd>{selectedState.vibeRating || '-'}/5</dd>
              </div>
              <div>
                <dt>Mention</dt>
                <dd>{selectedState.honorableMention ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Cities</dt>
                <dd>{selectedState.citiesVisited.length}</dd>
              </div>
              <div>
                <dt>Parks</dt>
                <dd>{selectedState.parksVisited.length}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{selectedState.updatedAt ? new Date(selectedState.updatedAt).toLocaleDateString() : '-'}</dd>
              </div>
            </dl>
            <button className="button" type="button" onClick={() => onEdit(selectedState.code)}>
              <Edit3 size={16} aria-hidden="true" />
              Edit selected state
            </button>
          </article>
        ) : (
          <div className="editor-empty-state">
            <h2>Choose a state to start editing.</h2>
            <p>Search or open the dropdown, then edit one atlas entry at a time.</p>
          </div>
        )}
      </section>
    </main>
  )
}
