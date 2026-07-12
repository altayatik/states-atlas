import { useEffect, useState } from 'react'
import { ArrowRight, Compass, MapPinned, Medal, Mountain, Sparkles } from 'lucide-react'
import { getOfficialParkDisplayName } from '../data/nationalParks'
import { formatStatus } from '../utils/formatters'
import { calculateTotal, getRankedRows } from '../utils/parkScoring'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useCountUp(value, duration = 950) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : 0)
  useEffect(() => {
    if (typeof value !== 'number' || Number.isNaN(value) || prefersReducedMotion()) {
      setDisplay(value)
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return display
}

function StatStamp({ value, unit, label, sub, tone, rotate, delay }) {
  const shown = useCountUp(value)
  return (
    <div className="stat-stamp" data-tone={tone} style={{ '--rot': `${rotate}deg`, '--d': `${delay}ms` }}>
      <span className="stat-stamp__ring" aria-hidden="true" />
      <strong>{shown}{unit && <em>{unit}</em>}</strong>
      <span className="stat-stamp__label">{label}</span>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function MiniRegionDial({ region }) {
  const percent = Math.min(100, Math.max(0, Math.round(region.percent)))
  return (
    <div className="mini-region" style={{ '--p': `${percent}%` }}>
      <span className="mini-region__dial">
        <span className="mini-region__ring" aria-hidden="true" />
        <strong>{percent}%</strong>
      </span>
      <span className="mini-region__label">{region.region}</span>
      <small>{region.visited}/{region.total}</small>
    </div>
  )
}

function formatUpdatedAt(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function getLatestState(states) {
  return states
    .filter((state) => state.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
}

export function OverviewSection({ achievements, parkRankings, regions, states, stats }) {
  const progress = Math.min(100, Math.max(0, Math.round(stats.completionPercent)))
  const overviewRegions = regions.filter((region) => region.region !== 'Canada')
  const latestState = getLatestState(states)
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length
  const topPark = getRankedRows(parkRankings)[0]?.ranking
  const latestLabel = latestState
    ? `${formatStatus(latestState.status)}${formatUpdatedAt(latestState.updatedAt) ? ` · ${formatUpdatedAt(latestState.updatedAt)}` : ''}`
    : 'Ready for the first pin'
  const topParkLabel = topPark ? `${calculateTotal(topPark.scores)}/100 total score` : 'Rank a park to start the wall'

  const stamps = [
    { value: stats.statesVisited, label: 'states', sub: `of ${stats.statesTotal}`, tone: 'sky', rotate: -3, delay: 0 },
    { value: stats.citiesLogged, label: 'cities', sub: 'wandered', tone: 'terracotta', rotate: 2.5, delay: 90 },
    { value: stats.parksMarked, label: 'parks', sub: 'explored', tone: 'forest', rotate: -1.5, delay: 180 },
    { value: unlockedCount, label: 'stamps', sub: 'earned', tone: 'gold', rotate: 3, delay: 270 },
  ]

  return (
    <main className="page journey">
      <section className="route-board" aria-labelledby="overview-title">
        <div className="route-board__lead">
          <span className="passport-mark">
            <Compass size={14} aria-hidden="true" />
            Altay &amp; Aidi · field atlas
          </span>
          <h1 className="journey-title" id="overview-title">
            Everywhere we&rsquo;ve{' '}
            <span className="rotator" aria-label="wandered">
              <span className="rotator__list">
                <span className="grad-text">wandered.</span>
                <span className="grad-text">hiked.</span>
                <span className="grad-text">road-tripped.</span>
                <span className="grad-text">flown.</span>
                <span className="grad-text">wandered.</span>
              </span>
            </span>
          </h1>
          <p className="journey-lede">
            A map we keep coloring in, a wall of park posters we keep arguing over, and a little
            book of stamps we collect along the way.
          </p>
          <div className="journey-cta">
            <a className="button" href="#/states">Open the map <ArrowRight size={17} aria-hidden="true" /></a>
            <a className="button button--secondary" href="#/parks">The park wall</a>
          </div>
        </div>

        <div className="route-board__right">
          <aside className="dial route-board__dial" style={{ '--p': `${progress}%` }} aria-label={`${progress}% of the 50 states explored`}>
            <span className="dial__dashes" aria-hidden="true" />
            <span className="dial__ring" aria-hidden="true" />
            <span className="dial__face">
              <strong>{progress}<em>%</em></strong>
              <span>explored</span>
            </span>
          </aside>
          <div className="mini-regions" aria-label="Progress by US region">
            {overviewRegions.map((region) => (
              <MiniRegionDial key={region.region} region={region} />
            ))}
          </div>
          <div className="route-board__ticket" aria-label="Latest dispatch">
            <span>Latest stop</span>
            <strong>{latestState ? latestState.name : 'Open road'}</strong>
            <small>{latestLabel}</small>
          </div>
        </div>
      </section>

      <section className="route-dashboard" aria-label="Travel atlas overview">
        <div className="route-dashboard__metrics" aria-label="By the numbers">
          {stamps.map((stamp) => (
            <StatStamp key={stamp.label} {...stamp} />
          ))}
        </div>

        <div className="route-stops" aria-label="Explore">
          <a className="route-stop route-stop--map" href="#/states">
            <span className="route-stop__pin" aria-hidden="true">01</span>
            <span className="route-stop__icon" aria-hidden="true"><MapPinned size={18} /></span>
            <span className="route-stop__meta">Map route</span>
            <strong>{latestState ? latestState.name : 'Where we’ve been'}</strong>
            <small>{latestState ? latestLabel : 'Open the map and start marking states.'}</small>
            <span className="route-stop__go">Explore the atlas <ArrowRight size={15} aria-hidden="true" /></span>
          </a>

          <a className="route-stop route-stop--parks" href="#/parks">
            <span className="route-stop__pin" aria-hidden="true">02</span>
            <span className="route-stop__icon" aria-hidden="true"><Mountain size={18} /></span>
            <span className="route-stop__meta">Poster wall</span>
            <strong>{topPark ? getOfficialParkDisplayName(topPark.parkName) : 'Park rankings'}</strong>
            <small>{topParkLabel}</small>
            <span className="route-stop__go">See the wall <ArrowRight size={15} aria-hidden="true" /></span>
          </a>

          <a className="route-stop route-stop--badges" href="#/achievements">
            <span className="route-stop__pin" aria-hidden="true">03</span>
            <span className="route-stop__icon" aria-hidden="true"><Medal size={18} /></span>
            <span className="route-stop__meta">Stamp book</span>
            <strong>{unlockedCount} of {achievements.length} earned</strong>
            <small>Milestones unlock as the map and poster wall fill in.</small>
            <span className="route-stop__go">Open the quest board <ArrowRight size={15} aria-hidden="true" /></span>
          </a>
        </div>

        <aside className="dispatch-panel" aria-label="Atlas dispatch">
          <p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> On deck</p>
          <h2>The next good excuse to go.</h2>
          <div className="dispatch-panel__rows">
            <div>
              <span>Current champion</span>
              <strong>{topPark ? getOfficialParkDisplayName(topPark.parkName) : 'No park yet'}</strong>
            </div>
            <div>
              <span>Route coverage</span>
              <strong>{stats.statesVisited}/{stats.statesTotal} states</strong>
            </div>
            <div>
              <span>Stamp progress</span>
              <strong>{unlockedCount}/{achievements.length} earned</strong>
            </div>
          </div>
        </aside>
      </section>

    </main>
  )
}
