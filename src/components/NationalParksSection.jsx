import { CalendarDays, Crown, MapPin, Mountain, Sparkles } from 'lucide-react'
import {
  canadianNationalParks,
  getOfficialParkCountry,
  getOfficialParkDisplayName,
} from '../data/nationalParks'
import {
  calculateAverage,
  calculateTotal,
  getBestForLabel,
  getRankedRows,
  getScoreTone,
  getTopCategories,
  scoreCategories,
} from '../utils/parkScoring'

function formatVisitedDate(visitedDate) {
  if (!visitedDate) return ''

  const date = new Date(`${visitedDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function ParkRankingCard({ isTied, rank, ranking }) {
  const total = calculateTotal(ranking.scores)
  const average = calculateAverage(ranking.scores)
  const bestFor = getBestForLabel(ranking.scores)
  const { categories: topCategories, topScore } = getTopCategories(ranking.scores)
  const visitedLabel = formatVisitedDate(ranking.visitedDate)
  const topCategoryLabel = topCategories.map((category) => category.label).join(' + ')
  const rankTone = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'green'
  const displayName = ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)

  return (
    <details className="park-ranking-card">
      <summary className="park-ranking-summary">
        <span className={`park-rank-badge park-rank-badge--${rankTone}`} aria-label={`Rank ${rank}`}>
          <span>#{rank}</span>
          {ranking.honorableMention && <Crown size={15} aria-label="Honorable mention" />}
        </span>

        <span className="park-ranking-summary__main">
          <span className="park-ranking-name">{displayName}</span>
          <span className="park-ranking-meta">
            {ranking.state && (
              <span>
                <MapPin size={14} aria-hidden="true" />
                {ranking.state}
              </span>
            )}
            {visitedLabel && (
              <span>
                <CalendarDays size={14} aria-hidden="true" />
                {visitedLabel}
              </span>
            )}
          </span>
        </span>

        <span className="park-ranking-summary__tags">
          <span className="travel-tag travel-tag--score">
            {total}/50
          </span>
          <span className="travel-tag travel-tag--best">
            <Sparkles size={14} aria-hidden="true" />
            {bestFor}
          </span>
          {isTied && <span className="travel-tag">Tied</span>}
          {ranking.honorableMention && (
            <span className="travel-tag travel-tag--honorable">
              <Crown size={14} aria-hidden="true" />
              Honorable mention
            </span>
          )}
        </span>
      </summary>

      <div className="park-ranking-card__details">
        <div className="park-score-summary">
          <span>Average {average.toFixed(1)}/10</span>
          <span>Top score: {topCategoryLabel} · {topScore}/10</span>
        </div>

        <dl className="park-score-grid">
          {scoreCategories.map((category) => {
            const score = ranking.scores[category.key]
            const tone = getScoreTone(score)

            return (
              <div
                className="park-score"
                key={category.key}
                style={{
                  '--score-bg': tone.background,
                  '--score-color': tone.color,
                  '--score-text': tone.text,
                }}
              >
                <dt>{category.label}</dt>
                <dd>{score}</dd>
              </div>
            )
          })}
        </dl>

        {ranking.notes && <p className="park-notes">{ranking.notes}</p>}
      </div>
    </details>
  )
}

const parkScopeLinks = [
  ['us', 'U.S. National Parks'],
  ['canada', 'Canada National Parks'],
  ['all', 'All National Parks'],
]

function getRankingCountry(ranking) {
  if (ranking.country && ranking.country !== 'custom') return ranking.country
  return getOfficialParkCountry(ranking.parkName)
}

function filterRankingsByScope(rankings, activeScope) {
  if (activeScope === 'all') return rankings
  return rankings.filter((ranking) => {
    const country = getRankingCountry(ranking)
    if (activeScope === 'canada') return country === 'canada'
    return country !== 'canada'
  })
}

function CanadaParkGuide() {
  return (
    <section className="canada-park-guide" aria-labelledby="canada-park-guide-title">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Reference list</p>
          <h3 id="canada-park-guide-title">Canadian parks to keep on the radar</h3>
        </div>
      </div>
      <div className="canada-park-grid">
        {canadianNationalParks.map((park) => (
          <article className="canada-park-card" key={park.parkCode}>
            <strong>{park.name}</strong>
            <span>{park.state}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export function NationalParksSection({ activeScope = 'us', isLoading, loadError, rankings }) {
  const filteredRankings = filterRankingsByScope(rankings, activeScope)
  const rankedRows = getRankedRows(filteredRankings)
  const showCanadaGuide = activeScope === 'canada' || activeScope === 'all'
  const emptyCopy = activeScope === 'canada'
    ? 'No Canadian parks ranked yet.'
    : 'No parks ranked yet.'

  return (
    <main>
      <section className="content-section parks-section" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <Mountain size={18} aria-hidden="true" />
              Travel Atlas
            </p>
            <h2>National Parks</h2>
          </div>
        </div>

        <nav className="parks-subnav" aria-label="National parks views">
          {parkScopeLinks.map(([scope, label]) => (
            <a className={activeScope === scope ? 'is-active' : ''} href={`#/parks?scope=${scope}`} key={scope}>
              {label}
            </a>
          ))}
        </nav>

        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {isLoading ? (
          <div className="editor-empty-state">
            <h2>Loading park rankings...</h2>
          </div>
        ) : rankedRows.length === 0 ? (
          <div className="editor-empty-state">
            <h2>{emptyCopy}</h2>
            <p>Rankings will appear here after they are saved in Firebase.</p>
          </div>
        ) : (
          <div className="park-rankings-list">
            {rankedRows.map(({ isTied, rank, ranking }) => (
              <ParkRankingCard
                isTied={isTied}
                key={ranking.id}
                rank={rank}
                ranking={ranking}
              />
            ))}
          </div>
        )}

        {showCanadaGuide && <CanadaParkGuide />}
      </section>
    </main>
  )
}
