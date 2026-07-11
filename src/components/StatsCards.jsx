import { useEffect, useState } from 'react'
import { Flag, Heart, MapPin, Mountain, TentTree, Trophy } from 'lucide-react'
import { formatPercent } from '../utils/formatters'

const statConfig = [
  ['statesVisited', 'States visited', Flag, 'sky'],
  ['statesStayed', 'Stayed overnight', TentTree, 'mint'],
  ['favorites', 'Favorites', Heart, 'terracotta'],
  ['citiesLogged', 'Cities logged', MapPin, 'lavender'],
  ['parksMarked', 'Parks logged', Mountain, 'forest'],
  ['completionPercent', 'Explored', Trophy, 'gold'],
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
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

function renderStatValue(key, stats) {
  if (key === 'statesVisited') {
    return (
      <>
        <CountUp value={stats.statesVisited} />
        <span>/{stats.statesTotal}</span>
      </>
    )
  }

  if (key === 'completionPercent') {
    return <CountUp formatter={(value) => `${value}%`} value={Math.round(stats.completionPercent)} />
  }

  return <CountUp value={stats[key]} />
}

export function RegionalProgress({ regions }) {
  return (
    <div className="region-panel" aria-label="Regional progress">
      {regions.map((region) => (
        <div className="region-row" key={region.region}>
          <span>{region.region}</span>
          <div className="region-row__track" aria-hidden="true">
            <span style={{ width: `${region.percent}%` }} />
          </div>
          <strong>
            {region.visited}/{region.total}
          </strong>
          <span className="sr-only">{formatPercent(region.percent)} complete</span>
        </div>
      ))}
    </div>
  )
}

export function StatsCards({ stats, regions }) {
  return (
    <section className="stats" aria-label="Travel progress">
      <div className="stat-strip">
        {statConfig.map(([key, label, Icon, tone], index) => (
          <div className="stat-item" data-tone={tone} key={key} style={{ '--i': index }}>
            <span className="stat-item__icon" aria-hidden="true">
              <Icon size={17} />
            </span>
            <strong>{renderStatValue(key, stats)}</strong>
            <p>{label}</p>
          </div>
        ))}
      </div>

      <RegionalProgress regions={regions} />
    </section>
  )
}
