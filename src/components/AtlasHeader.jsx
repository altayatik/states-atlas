import { Map, Sparkles, Wrench } from 'lucide-react'
import { formatPercent } from '../utils/formatters'

export function AtlasHeader({ stats }) {
  return (
    <header className="atlas-header glass-panel">
      <div className="atlas-header__copy">
        <p className="eyebrow">
          <Map size={18} aria-hidden="true" />
          Personal travel atlas
        </p>
        <h1>Altay & Aidi’s Travel Atlas</h1>
        <p>A polished living journal for states, cities, park rankings, milestones, and favorite memories.</p>
      </div>
      <div className="atlas-header__actions">
        {stats && (
          <span className="atlas-header__stat">
            <Sparkles size={16} aria-hidden="true" />
            {formatPercent(stats.completionPercent)} complete
          </span>
        )}
        <a aria-label="Edit atlas" className="button button--secondary button--icon" href="#/edit" title="Edit atlas">
          <Wrench size={18} aria-hidden="true" />
          <span className="sr-only">Edit atlas</span>
        </a>
      </div>
    </header>
  )
}
