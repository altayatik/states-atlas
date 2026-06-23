import { Edit3, MapPin, Mountain, Star } from 'lucide-react'
import { BADGE_LABELS } from '../data/states'
import { formatList, formatStatus } from '../utils/formatters'
import { getRelatedStateNames, isMetroVisited, isParkVisited } from '../utils/places'

export function StateDetailPanel({ selectedItem, state, states = [], showEdit = false, onEdit }) {
  if (selectedItem?.item) {
    const { item, type } = selectedItem
    const relatedStates = getRelatedStateNames(item.stateCodes, states)
    const isVisited = type === 'metro'
      ? isMetroVisited(item, states)
      : isParkVisited(item, states)
    const isPark = type === 'park'

    return (
      <aside className="detail-panel detail-panel--place" aria-labelledby="place-detail-title">
        <div className="detail-panel__header">
          <div>
            <p className="eyebrow">{isPark ? 'National park' : 'City area'}</p>
            <h2 id="place-detail-title">{item.name}</h2>
          </div>
          {isPark ? <Mountain size={22} aria-hidden="true" /> : <MapPin size={22} aria-hidden="true" />}
        </div>

        <dl className="detail-list">
          <div>
            <dt>{relatedStates.length > 1 ? 'States' : 'State'}</dt>
            <dd>{formatList(relatedStates)}</dd>
          </div>
          <div>
            <dt>Atlas status</dt>
            <dd>{isVisited ? 'Logged in this atlas' : 'Not logged for the related state yet'}</dd>
          </div>
          {item.favoriteMemory && (
            <div>
              <dt>Memory</dt>
              <dd>{item.favoriteMemory}</dd>
            </div>
          )}
        </dl>
      </aside>
    )
  }

  if (!state) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <h2>Pick a state to explore.</h2>
      </aside>
    )
  }

  const hasDetails = Boolean(
    state.firstVisitedYear
    || state.favoriteMemory
    || state.honorableMention
    || state.vibeRating > 0
    || state.badges.length
    || state.citiesVisited.length
    || state.parksVisited.length,
  )

  return (
    <aside className="detail-panel" aria-labelledby="state-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">{formatStatus(state.status)}</p>
          <h2 id="state-detail-title">{state.name}</h2>
        </div>
        {showEdit && (
          <button aria-label={`Edit ${state.name}`} className="icon-button" type="button" onClick={onEdit}>
            <Edit3 size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {state.vibeRating > 0 && (
        <div className="vibe-meter" aria-label={`Vibe rating ${state.vibeRating} out of 5`}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Star
              className={rating <= state.vibeRating ? 'star star--filled' : 'star'}
              fill="currentColor"
              key={rating}
              size={22}
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      <dl className="detail-list">
        {state.firstVisitedYear && (
          <div>
            <dt>First visited</dt>
            <dd>{state.firstVisitedYear}</dd>
          </div>
        )}
        {state.favoriteMemory && (
          <div>
            <dt>Memory</dt>
            <dd>{state.favoriteMemory}</dd>
          </div>
        )}
        {state.honorableMention && (
          <div>
            <dt>Honorable mention</dt>
            <dd>Passport stamp worthy</dd>
          </div>
        )}
      </dl>

      {state.badges.length > 0 && (
        <div className="badge-row" aria-label="State badges">
          {state.badges.map((badge) => <span key={badge}>{BADGE_LABELS[badge]}</span>)}
        </div>
      )}

      {!hasDetails && <p className="panel-note">No travel notes logged yet.</p>}

      {state.citiesVisited.length > 0 && (
        <div className="mini-list">
          <h3>
            <MapPin size={17} aria-hidden="true" />
            Cities
          </h3>
          <p>{formatList(state.citiesVisited)}</p>
        </div>
      )}
      {state.parksVisited.length > 0 && (
        <div className="mini-list">
          <h3>
            <Mountain size={17} aria-hidden="true" />
            National parks
          </h3>
          <p>{formatList(state.parksVisited)}</p>
        </div>
      )}
    </aside>
  )
}
