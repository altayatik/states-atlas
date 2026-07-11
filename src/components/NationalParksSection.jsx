import { useMemo, useState } from 'react'
import { ArrowDownUp, CalendarDays, Crown, MapPin, Mountain, Search, Sparkles } from 'lucide-react'
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

function getSortableDate(ranking) {
  const date = ranking.visitedDate || ranking.updatedAt || ranking.createdAt
  const timestamp = new Date(date).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
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
    <article className="park-ranking-card glass-card">
      <div className="park-ranking-card__top">
        <span className={`park-rank-badge park-rank-badge--${rankTone}`} aria-label={`Rank ${rank}`}>
          #{rank}
        </span>

        <div className="park-ranking-card__title">
          <p className="eyebrow">
            <Mountain size={15} aria-hidden="true" />
            {ranking.parkCode || 'Travel ranking'}
          </p>
          <h3>{displayName}</h3>
          <div className="park-ranking-meta">
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
          </div>
        </div>

        <div className="park-total-score" aria-label={`Total score ${total} out of 50`}>
          <strong>{total}</strong>
          <span>/50</span>
        </div>
      </div>

      <div className="park-ranking-tags">
        <span className="travel-tag travel-tag--best">
          <Sparkles size={14} aria-hidden="true" />
          {bestFor}
        </span>
        <span className="travel-tag">Average {average.toFixed(1)}/10</span>
        <span className="travel-tag">Top: {topCategoryLabel} · {topScore}/10</span>
        {isTied && <span className="travel-tag">Tied score</span>}
        {ranking.honorableMention && (
          <span className="travel-tag travel-tag--honorable">
            <Crown size={14} aria-hidden="true" />
            Honorable mention
          </span>
        )}
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
                '--score-width': `${score * 10}%`,
              }}
            >
              <dt>{category.label}</dt>
              <dd>{score}</dd>
              <span aria-hidden="true" />
            </div>
          )
        })}
      </dl>

      {ranking.notes && <p className="park-notes">{ranking.notes}</p>}
    </article>
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
      <div className="section-header section-header--compact">
        <div>
          <p className="eyebrow">Reference list</p>
          <h3 id="canada-park-guide-title">Canadian parks to keep on the radar</h3>
        </div>
      </div>
      <div className="canada-park-grid">
        {canadianNationalParks.map((park) => (
          <article className="canada-park-card glass-card" key={park.parkCode}>
            <strong>{park.name}</strong>
            <span>{park.state}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function sortRows(rows, sortKey) {
  if (sortKey === 'name') {
    return [...rows].sort((a, b) => a.ranking.parkName.localeCompare(b.ranking.parkName))
  }

  if (sortKey === 'date') {
    return [...rows].sort((a, b) => getSortableDate(b.ranking) - getSortableDate(a.ranking))
  }

  return rows
}

export function NationalParksSection({ activeScope = 'us', isLoading, loadError, rankings }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState('score')
  const [mentionFilter, setMentionFilter] = useState('all')

  const filteredRankings = useMemo(
    () => filterRankingsByScope(rankings, activeScope),
    [activeScope, rankings],
  )
  const rankedRows = useMemo(() => getRankedRows(filteredRankings), [filteredRankings])
  const visibleRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const searchedRows = rankedRows.filter(({ ranking }) => {
      const displayName = ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)
      const matchesSearch = !normalizedQuery
        || displayName.toLowerCase().includes(normalizedQuery)
        || ranking.state?.toLowerCase().includes(normalizedQuery)
        || ranking.parkCode?.toLowerCase().includes(normalizedQuery)
      const matchesMention = mentionFilter === 'all'
        || (mentionFilter === 'honorable' && ranking.honorableMention)
        || (mentionFilter === 'ranked' && !ranking.honorableMention)

      return matchesSearch && matchesMention
    })

    return sortRows(searchedRows, sortKey)
  }, [mentionFilter, rankedRows, searchQuery, sortKey])
  const showCanadaGuide = activeScope === 'canada' || activeScope === 'all'
  const emptyCopy = activeScope === 'canada'
    ? 'No Canadian parks ranked yet.'
    : 'No parks ranked yet.'

  return (
    <main className="public-page public-page--parks">
      <section className="parks-section" aria-live="polite">
        <div className="section-header">
          <div>
            <p className="eyebrow">
              <Mountain size={18} aria-hidden="true" />
              National Parks
            </p>
            <h2>Ranked park journal</h2>
          </div>
          <p>Every park is scored out of 50 across scenery, visitor centers, facilities, trails, and roads — a running ranking of the places we loved most.</p>
        </div>

        <nav className="parks-subnav glass-nav" aria-label="National parks views">
          {parkScopeLinks.map(([scope, label]) => (
            <a className={activeScope === scope ? 'is-active' : ''} href={`#/parks?scope=${scope}`} key={scope}>
              {label}
            </a>
          ))}
        </nav>

        <div className="parks-toolbar glass-panel" aria-label="Park ranking filters">
          <label className="search-field">
            <span>Search parks</span>
            <Search size={17} aria-hidden="true" />
            <input
              placeholder="Search by park, state, or code"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label>
            <span>Sort</span>
            <ArrowDownUp size={17} aria-hidden="true" />
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="score">Score rank</option>
              <option value="date">Visited or updated date</option>
              <option value="name">Park name</option>
            </select>
          </label>
          <label>
            <span>Filter</span>
            <Crown size={17} aria-hidden="true" />
            <select value={mentionFilter} onChange={(event) => setMentionFilter(event.target.value)}>
              <option value="all">All rankings</option>
              <option value="honorable">Honorable mentions</option>
              <option value="ranked">Ranked only</option>
            </select>
          </label>
        </div>

        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {isLoading ? (
          <div className="editor-empty-state glass-panel">
            <h2>Loading park rankings...</h2>
          </div>
        ) : rankedRows.length === 0 ? (
          <div className="editor-empty-state glass-panel">
            <h2>{emptyCopy}</h2>
            <p>Rankings will appear here after they are saved in Firebase.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="editor-empty-state glass-panel">
            <h2>No parks match those filters.</h2>
            <p>Try a broader search or switch the honorable mention filter.</p>
          </div>
        ) : (
          <div className="park-rankings-list">
            {visibleRows.map(({ isTied, rank, ranking }) => (
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
