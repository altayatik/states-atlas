import { ArrowRight, Crown, Heart, MapPinned, Sparkles, Trophy } from 'lucide-react'
import { getOfficialParkDisplayName } from '../data/nationalParks'
import { formatStatus } from '../utils/formatters'
import { calculateTotal, getRankedRows } from '../utils/parkScoring'
import { RegionalProgress } from './StatsCards'

function formatUpdatedAt(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

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
  const progress = Math.min(100, Math.max(0, Math.round(stats.completionPercent)))
  const latestState = getLatestState(states)
  const favoriteStates = getFavoriteStates(states)
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length
  const topParkRow = getRankedRows(parkRankings)[0]
  const topPark = topParkRow?.ranking

  const heroStats = [
    [stats.statesVisited, `of ${stats.statesTotal} states`],
    [stats.citiesLogged, 'cities logged'],
    [stats.parksMarked, 'parks explored'],
    [unlockedCount, 'milestones earned'],
  ]

  return (
    <main className="page page--overview">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">Altay &amp; Aidi</p>
          <h1 id="hero-title">
            Every trip, one map.
          </h1>
          <p className="hero__lede">
            The states we&rsquo;ve crossed, the cities we&rsquo;ve wandered, and the parks
            we keep arguing about ranking — kept in one living travel journal.
          </p>
          <div className="hero__actions">
            <a className="button" href="#/states">
              Explore the map
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="button button--secondary" href="#/parks">
              Park rankings
            </a>
          </div>
        </div>

        <div
          className="hero__ring"
          style={{ '--progress': `${progress}%` }}
          role="img"
          aria-label={`${progress} percent of the United States explored`}
        >
          <span className="hero__ring-track" aria-hidden="true" />
          <div className="hero__ring-center">
            <strong>{progress}%</strong>
            <span>explored</span>
          </div>
        </div>

        <dl className="hero__stats">
          {heroStats.map(([value, label]) => (
            <div className="hero__stat" key={label}>
              <dd>{value}</dd>
              <dt>{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="highlights" aria-label="Latest highlights">
        <a className="highlight-card" href="#/states">
          <span className="highlight-card__icon highlight-card__icon--sky" aria-hidden="true">
            <MapPinned size={18} />
          </span>
          <div>
            <h2>{latestState ? latestState.name : 'The map is waiting'}</h2>
            <p>
              {latestState
                ? `Latest entry — ${formatStatus(latestState.status)}${formatUpdatedAt(latestState.updatedAt) ? `, ${formatUpdatedAt(latestState.updatedAt)}` : ''}`
                : 'Open the map and start marking states.'}
            </p>
          </div>
          <ArrowRight className="highlight-card__arrow" size={16} aria-hidden="true" />
        </a>

        <a className="highlight-card" href="#/parks">
          <span className="highlight-card__icon highlight-card__icon--gold" aria-hidden="true">
            <Crown size={18} />
          </span>
          <div>
            <h2>{topPark ? getOfficialParkDisplayName(topPark.parkName) : 'No parks ranked yet'}</h2>
            <p>
              {topPark
                ? `Reigning champion — ${calculateTotal(topPark.scores)}/50`
                : 'Rank a park and the champion appears here.'}
            </p>
          </div>
          <ArrowRight className="highlight-card__arrow" size={16} aria-hidden="true" />
        </a>

        <a className="highlight-card" href="#/achievements">
          <span className="highlight-card__icon highlight-card__icon--mint" aria-hidden="true">
            <Trophy size={18} />
          </span>
          <div>
            <h2>{unlockedCount} of {achievements.length} milestones</h2>
            <p>Badges unlock as the map fills in.</p>
          </div>
          <ArrowRight className="highlight-card__arrow" size={16} aria-hidden="true" />
        </a>

        <a className="highlight-card" href="#/states">
          <span className="highlight-card__icon highlight-card__icon--terracotta" aria-hidden="true">
            <Heart size={18} />
          </span>
          <div>
            <h2>
              {favoriteStates.length
                ? favoriteStates.map((state) => state.name).join(', ')
                : 'Favorites are waiting'}
            </h2>
            <p>
              {favoriteStates.length
                ? 'The states that earned the favorite stamp.'
                : 'Mark a state as a favorite and it lands here.'}
            </p>
          </div>
          <ArrowRight className="highlight-card__arrow" size={16} aria-hidden="true" />
        </a>
      </section>

      <section className="overview-regions" aria-label="Progress by region">
        <div className="section-header">
          <div>
            <p className="eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Region by region
            </p>
            <h2>How the country is filling in</h2>
          </div>
          <p>{stats.parksMarked} parks logged across {stats.statesVisited} states.</p>
        </div>
        <RegionalProgress regions={regions} />
      </section>
    </main>
  )
}
