import { Flag, Heart, MapPin, Mountain, Star, TentTree, Trophy } from 'lucide-react'
import { formatPercent } from '../utils/formatters'

const statConfig = [
  ['statesVisited', 'States visited', Flag],
  ['statesStayed', 'Stayed overnight', TentTree],
  ['favorites', 'Favorites', Heart],
  ['citiesLogged', 'Cities logged', MapPin],
  ['parksMarked', 'Parks marked', Mountain],
  ['completionPercent', 'Completion', Trophy],
]

export function StatsCards({ stats, regions }) {
  return (
    <section className="stats-section" aria-label="Travel progress">
      <div className="stats-grid">
        {statConfig.map(([key, label, Icon]) => {
          const value =
            key === 'statesVisited'
              ? `${stats.statesVisited}/${stats.statesTotal}`
              : key === 'completionPercent'
                ? formatPercent(stats.completionPercent)
                : stats[key]

          return (
            <article className="stat-card" key={key}>
              <div className="stat-card__icon">
                <Icon size={20} aria-hidden="true" />
              </div>
              <p>{label}</p>
              <strong>{value}</strong>
            </article>
          )
        })}
        <article className="stat-card stat-card--wide">
          <div className="stat-card__icon">
            <Star size={20} aria-hidden="true" />
          </div>
          <p>Latest updated</p>
          <strong>{stats.latestUpdated?.name ?? 'No edits yet'}</strong>
        </article>
      </div>

      <div className="regional-progress" aria-label="Regional progress">
        {regions.map((region) => (
          <div className="region-row" key={region.region}>
            <span>{region.region}</span>
            <div className="region-row__track" aria-hidden="true">
              <span style={{ width: `${region.percent}%` }} />
            </div>
            <strong>
              {region.visited}/{region.total}
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}
