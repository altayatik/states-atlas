import { CalendarDays, CheckCircle2, Compass, MapPinned, Mountain, Sparkles, Trophy } from 'lucide-react'
import { getOfficialParkDisplayName } from '../data/nationalParks'
import { formatPercent, formatStatus } from '../utils/formatters'
import { calculateTotal, getRankedRows } from '../utils/parkScoring'
import { StatsCards } from './StatsCards'

function formatUpdatedAt(value) {
  if (!value) return 'Fresh entries appear here after edits'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently updated'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getLatestState(states) {
  return states
    .filter((state) => state.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
}

function getFavoriteStates(states) {
  return states.filter((state) => state.status === 'favorite').slice(0, 4)
}

export function OverviewSection({ achievements, parkRankings, regions, states, stats }) {
  const progress = Math.round(stats.completionPercent)
  const latestState = getLatestState(states)
  const favoriteStates = getFavoriteStates(states)
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length
  const topParkRow = getRankedRows(parkRankings)[0]
  const topPark = topParkRow?.ranking

  return (
    <main className="overview-page">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="overview-hero__copy">
          <p className="eyebrow">
            <Compass size={17} aria-hidden="true" />
            Combined Travel Atlas
          </p>
          <h2 id="overview-title">A personal map of where the good stories happened.</h2>
          <p>
            States, cities, national parks, favorite memories, and tiny victories live together here as one visual travel journal.
          </p>
          <div className="overview-hero__actions" aria-label="Primary sections">
            <a className="button" href="#/states">
              <MapPinned size={18} aria-hidden="true" />
              Open map
            </a>
            <a className="button button--secondary" href="#/parks">
              <Mountain size={18} aria-hidden="true" />
              Park rankings
            </a>
          </div>
        </div>

        <div
          className="progress-orbit glass-panel"
          style={{ '--progress': `${Math.min(100, Math.max(0, progress))}%` }}
          aria-label={`Travel completion ${formatPercent(stats.completionPercent)}`}
        >
          <span className="progress-orbit__ring" aria-hidden="true" />
          <div className="progress-orbit__content">
            <strong>{formatPercent(stats.completionPercent)}</strong>
            <span>travel progress</span>
          </div>
        </div>
      </section>

      <StatsCards parkRankingsCount={parkRankings.length} regions={regions} stats={stats} />

      <section className="overview-grid" aria-label="Travel atlas highlights">
        <article className="glass-card insight-card insight-card--wide">
          <div className="insight-card__icon">
            <Sparkles size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Latest atlas note</p>
            <h3>{latestState ? latestState.name : 'Ready for the next entry'}</h3>
            <p>
              {latestState
                ? `${formatStatus(latestState.status)} · ${formatUpdatedAt(latestState.updatedAt)}`
                : 'Choose a state in the editor when the next trip memory is ready.'}
            </p>
          </div>
        </article>

        <article className="glass-card insight-card">
          <div className="insight-card__icon insight-card__icon--gold">
            <Trophy size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Top park</p>
            <h3>{topPark ? getOfficialParkDisplayName(topPark.parkName) : 'No ranked parks yet'}</h3>
            <p>{topPark ? `${calculateTotal(topPark.scores)}/50 total score` : 'Rank a park and the champion appears here.'}</p>
          </div>
        </article>

        <article className="glass-card insight-card">
          <div className="insight-card__icon insight-card__icon--green">
            <CheckCircle2 size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Achievements</p>
            <h3>{unlockedCount}/{achievements.length} unlocked</h3>
            <p>Locked badges stay muted until the atlas earns them.</p>
          </div>
        </article>

        <article className="glass-card insight-card insight-card--wide">
          <div className="insight-card__icon insight-card__icon--lavender">
            <CalendarDays size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Favorite states</p>
            <h3>{favoriteStates.length ? favoriteStates.map((state) => state.name).join(', ') : 'Favorites are waiting'}</h3>
            <p>Favorites get a warmer map color and a little extra glow across the atlas.</p>
          </div>
        </article>
      </section>
    </main>
  )
}
