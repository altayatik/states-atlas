import { Route, Wrench } from 'lucide-react'

export function AtlasHeader() {
  return (
    <header className="atlas-header">
      <div className="atlas-header__copy">
        <p className="eyebrow">
          <Route size={18} aria-hidden="true" />
          Personal 50 states travel map
        </p>
        <h1>Altay & Aidi’s Road Atlas</h1>
        <p>A living map of states, cities, parks, and favorite memories.</p>
      </div>
      <div className="atlas-header__actions">
        <a aria-label="Edit atlas" className="button button--secondary button--icon" href="/states/#/edit" title="Edit atlas">
          <Wrench size={18} aria-hidden="true" />
          <span className="sr-only">Edit atlas</span>
        </a>
      </div>
    </header>
  )
}
