import { Edit3, MapPin, Mountain, Star } from 'lucide-react'
import { BADGE_LABELS } from '../data/states'
import { formatList, formatStatus } from '../utils/formatters'

export function StateDetailPanel({ state, cities, parks, selectedMapItem, showEdit = false, onEdit }) {
  if (!state) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <h2>Pick a state on the map to start your atlas.</h2>
        <p>No states logged yet. Time to hit the road.</p>
      </aside>
    )
  }

  const stateCities = cities.filter((city) => city.stateCode === state.code || state.citiesVisited.includes(city.name))
  const stateParks = parks.filter((park) => park.states.includes(state.code) || state.parksVisited.includes(park.name))

  if (selectedMapItem?.type === 'metro') {
    return (
      <aside className="detail-panel detail-panel--place" aria-labelledby="state-detail-title">
        <div className="detail-panel__header">
          <div>
            <p className="eyebrow">
              <MapPin size={17} aria-hidden="true" />
              Metro outline
            </p>
            <h2 id="state-detail-title">{selectedMapItem.name}</h2>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>States</dt>
            <dd>{selectedMapItem.stateCodes.join(', ')}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selectedMapItem.status}</dd>
          </div>
          <div>
            <dt>Memory</dt>
            <dd>{selectedMapItem.favoriteMemory || 'No metro memory yet.'}</dd>
          </div>
        </dl>
        <p className="panel-note">Zoom in to see metro footprints become more prominent.</p>
      </aside>
    )
  }

  if (selectedMapItem?.type === 'park') {
    return (
      <aside className="detail-panel detail-panel--place" aria-labelledby="state-detail-title">
        <div className="detail-panel__header">
          <div>
            <p className="eyebrow">
              <Mountain size={17} aria-hidden="true" />
              Park outline
            </p>
            <h2 id="state-detail-title">{selectedMapItem.name}</h2>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>States</dt>
            <dd>{selectedMapItem.stateCodes.join(', ')}</dd>
          </div>
          <div>
            <dt>Visited</dt>
            <dd>{selectedMapItem.visited ? 'Marked in the atlas' : 'Not marked yet'}</dd>
          </div>
          <div>
            <dt>Layer</dt>
            <dd>National park visual outline</dd>
          </div>
        </dl>
        <p className="panel-note">These outlines are intentionally lightweight for the MVP.</p>
      </aside>
    )
  }

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

      <div className="vibe-meter" aria-label={`Vibe rating ${state.vibeRating || 0} out of 5`}>
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

      <dl className="detail-list">
        <div>
          <dt>First visited</dt>
          <dd>{state.firstVisitedYear || 'Not logged yet'}</dd>
        </div>
        <div>
          <dt>Memory</dt>
          <dd>{state.favoriteMemory || 'No memory yet.'}</dd>
        </div>
        <div>
          <dt>Honorable mention</dt>
          <dd>{state.honorableMention ? 'Passport stamp worthy' : 'Not yet'}</dd>
        </div>
      </dl>

      <div className="badge-row" aria-label="State badges">
        {state.badges.length ? (
          state.badges.map((badge) => <span key={badge}>{BADGE_LABELS[badge]}</span>)
        ) : (
          <span>No badges yet</span>
        )}
      </div>

      <div className="mini-list">
        <h3>
          <MapPin size={17} aria-hidden="true" />
          Cities
        </h3>
        <p>{formatList(stateCities.map((city) => city.name))}</p>
      </div>
      <div className="mini-list">
        <h3>
          <Mountain size={17} aria-hidden="true" />
          National parks
        </h3>
        <p>{formatList(stateParks.map((park) => park.name))}</p>
      </div>
    </aside>
  )
}
