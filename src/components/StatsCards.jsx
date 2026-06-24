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

function getProgressColor(percent) {
  if (percent <= 20) return '#d78a83'
  if (percent <= 40) return '#c9825d'
  if (percent <= 65) return '#d8b84f'
  if (percent <= 85) return '#89cda7'
  return '#5fa77d'
}

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
              <span style={{ '--progress-color': getProgressColor(region.percent), width: `${region.percent}%` }} />
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
