import { Route } from 'lucide-react'

export function AtlasHeader() {
  return (
    <header className="atlas-header">
      <div className="atlas-header__copy">
        <p className="eyebrow">
          <Route size={18} aria-hidden="true" />
          Personal 50 states travel map
        </p>
        <h1>Altay & Aidi&apos;s Road Atlas</h1>
        <p>A living map of states, cities, parks, and favorite memories.</p>
      </div>
    </header>
  )
}
