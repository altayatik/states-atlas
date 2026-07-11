import { useEffect, useState } from 'react'
import { Flag, Heart, MapPin, Mountain, TentTree, Trophy } from 'lucide-react'
import { formatPercent } from '../utils/formatters'

const statConfig = [
  ['statesVisited', 'States visited', Flag, '#9cc9ff', '#234a63'],
  ['statesStayed', 'Stayed overnight', TentTree, '#9edab2', '#245c42'],
  ['favorites', 'Favorites', Heart, '#f7ce5b', '#684d0c'],
  ['citiesLogged', 'Cities logged', MapPin, '#caa7ff', '#54437a'],
  ['parksMarked', 'Parks logged/ranked', Mountain, '#89d9cf', '#1f5f58'],
  ['completionPercent', 'Completion', Trophy, '#f0a97d', '#75432d'],
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function getProgressColor(percent) {
  if (percent <= 20) return '#d78a83'
  if (percent <= 40) return '#c9825d'
  if (percent <= 65) return '#d8b84f'
  if (percent <= 85) return '#89cda7'
  return '#5fa77d'
}

function CountUp({ duration = 650, formatter = (value) => value, value }) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (!Number.isFinite(value) || prefersReducedMotion()) {
      setDisplayValue(value)
      return undefined
    }

    let frameId = 0
    const startTime = performance.now()
    const startValue = 0

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + (value - startValue) * eased))

      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [duration, value])

  return formatter(displayValue)
}

function renderStatValue(key, stats, parkRankingsCount) {
  if (key === 'statesVisited') {
    return (
      <>
        <CountUp value={stats.statesVisited} />
        <span>/{stats.statesTotal}</span>
      </>
    )
  }

  if (key === 'parksMarked') {
    return (
      <>
        <CountUp value={stats.parksMarked} />
        <span>/{parkRankingsCount}</span>
      </>
    )
  }

  if (key === 'completionPercent') {
    return <CountUp formatter={(value) => `${value}%`} value={Math.round(stats.completionPercent)} />
  }

  return <CountUp value={stats[key]} />
}

export function StatsCards({ parkRankingsCount = 0, stats, regions }) {
  return (
    <section className="stats-section" aria-label="Travel progress">
      <div className="stats-grid">
        {statConfig.map(([key, label, Icon, accent, ink], index) => (
          <article
            className="stat-card glass-card"
            key={key}
            style={{
              '--stat-accent': accent,
              '--stat-index': index,
              '--stat-ink': ink,
            }}
          >
            <div className="stat-card__icon">
              <Icon size={20} aria-hidden="true" />
            </div>
            <p>{label}</p>
            <strong>{renderStatValue(key, stats, parkRankingsCount)}</strong>
          </article>
        ))}
      </div>

      <div className="regional-progress glass-panel" aria-label="Regional progress">
        {regions.map((region) => (
          <div className="region-row" key={region.region}>
            <span>{region.region}</span>
            <div className="region-row__track" aria-hidden="true">
              <span style={{ '--progress-color': getProgressColor(region.percent), width: `${region.percent}%` }} />
            </div>
            <strong>
              {region.visited}/{region.total}
            </strong>
            <span className="sr-only">{formatPercent(region.percent)} complete</span>
          </div>
        ))}
      </div>
    </section>
  )
}
