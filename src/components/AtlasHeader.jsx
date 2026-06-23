import { Map, Route, Sparkles } from 'lucide-react'

export function AtlasHeader({ onEdit }) {
  return (
    <header className="atlas-header">
      <div className="atlas-header__copy">
        <p className="eyebrow">
          <Route size={18} aria-hidden="true" />
          Personal 50 states travel map
        </p>
        <h1>Altay & Aidi&apos;s Road Atlas</h1>
        <p>
          A warm little dashboard for states visited, city pins, park stamps, favorite memories, and the next stretch
          of open road.
        </p>
      </div>
      <div className="atlas-header__actions">
        <button className="button button--secondary" type="button" onClick={onEdit}>
          <Map size={18} aria-hidden="true" />
          Edit selected
        </button>
        <span className="stamp">
          <Sparkles size={16} aria-hidden="true" />
          MVP atlas
        </span>
      </div>
    </header>
  )
}
