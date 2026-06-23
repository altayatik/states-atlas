import { useState } from 'react'
import { Edit3 } from 'lucide-react'
import { formatStatus } from '../utils/formatters'
import { isVisited } from '../utils/stats'

export function StateList({ states, selectedStateCode, collapsed = false, showEdit = true, onSelectState, onEdit }) {
  const [isOpen, setIsOpen] = useState(!collapsed)

  return (
    <section className="content-section" aria-labelledby="state-list-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Browse fallback</p>
          <h2 id="state-list-title">State list</h2>
        </div>
        {collapsed && (
          <button className="button button--secondary" type="button" onClick={() => setIsOpen((value) => !value)}>
            {isOpen ? 'Hide states' : 'Browse states'}
          </button>
        )}
      </div>
      {isOpen && (
        <div className="state-list">
          {states.map((state) => (
            <article className={selectedStateCode === state.code ? 'state-row state-row--active' : 'state-row'} key={state.code}>
              <button type="button" onClick={() => onSelectState(state.code)}>
                <span>{state.code}</span>
                <strong>{state.name}</strong>
                <small>{formatStatus(state.status)}</small>
              </button>
              <div className="state-row__meta">
                <span>{isVisited(state) ? 'Logged' : 'Open road'}</span>
                {showEdit && (
                  <button aria-label={`Edit ${state.name}`} className="icon-button" type="button" onClick={() => onEdit(state.code)}>
                    <Edit3 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
