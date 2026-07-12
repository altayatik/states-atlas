import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Crown, Search } from 'lucide-react'
import {
  canadianNationalParks,
  getOfficialParkCountry,
  getOfficialParkDisplayName,
} from '../data/nationalParks'
import {
  calculateTotal,
  displayScore,
  getRankedRows,
  scoreCategories,
} from '../utils/parkScoring'

/* ---------- vintage poster engine ---------------------------------- */

// Deterministic little RNG so every park gets a stable, unique scene.
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// WPA / national-park screenprint palettes.
const PALETTES = [
  { id: 'canyon', sky: ['#f7b96b', '#e26a4c'], sun: '#ffd98a', back: '#cf6a4a', mid: '#a24534', front: '#7c322b', ground: '#4d241f', tree: '#5c2a21' },
  { id: 'alpine', sky: ['#bcd6e2', '#f4cba2'], sun: '#ffe7ae', back: '#6f8a9b', mid: '#48606f', front: '#31434f', ground: '#243139', tree: '#2a3a3f' },
  { id: 'forest', sky: ['#c2e6ca', '#edf6dd'], sun: '#ffe873', back: '#5f8d74', mid: '#3f6c57', front: '#2c4d3f', ground: '#233a2f', tree: '#1f352a' },
  { id: 'desert', sky: ['#ffdca6', '#f6a970'], sun: '#fff1b2', back: '#d98d4c', mid: '#b16531', front: '#8a4a26', ground: '#5f341f', tree: '#6a3d21' },
  { id: 'twilight', sky: ['#7d9abf', '#c6d0de'], sun: '#f3d5a3', back: '#4c6789', mid: '#334560', front: '#26334a', ground: '#192335', tree: '#1d2939' },
  { id: 'meadow', sky: ['#d6ec9f', '#f5f8c9'], sun: '#ffd166', back: '#88a85b', mid: '#608241', front: '#466030', ground: '#344525', tree: '#2e4022' },
  { id: 'coast', sky: ['#a6dce6', '#e7f4e0'], sun: '#ffe08a', back: '#4f9a97', mid: '#357b7a', front: '#255c5c', ground: '#1c4140', tree: '#1f4a44' },
  { id: 'volcano', sky: ['#f4a9a0', '#8f4a5c'], sun: '#ffd39a', back: '#a45663', mid: '#763a49', front: '#552936', ground: '#3a1c26', tree: '#442029' },
]

function ridgePath(rng, baseY, amp, segments, width = 320, height = 214) {
  const step = width / segments
  let d = `M0 ${baseY}`
  for (let i = 1; i <= segments; i += 1) {
    const x = step * i
    const peak = baseY - amp * (0.45 + rng() * 0.85)
    const cx = x - step / 2
    d += ` Q ${cx.toFixed(1)} ${peak.toFixed(1)} ${x.toFixed(1)} ${(baseY - amp * (rng() * 0.5)).toFixed(1)}`
  }
  d += ` L ${width} ${height} L 0 ${height} Z`
  return d
}

function treeRow(rng, y, count) {
  const trees = []
  for (let i = 0; i < count; i += 1) {
    const x = 14 + (292 / count) * i + rng() * 10
    const h = 12 + rng() * 12
    const w = h * 0.5
    trees.push(`M${x.toFixed(1)} ${y} l ${(-w).toFixed(1)} 0 l ${w.toFixed(1)} ${(-h).toFixed(1)} l ${w.toFixed(1)} ${h} Z`)
  }
  return trees.join(' ')
}

function PosterScene({ uid, palette, seed }) {
  const rng = makeRng(seed)
  const sunX = 60 + rng() * 200
  const hasLake = rng() > 0.55
  const gid = `sky-${uid}`
  const back = ridgePath(rng, 118, 34, 5)
  const mid = ridgePath(rng, 142, 40, 4)
  const front = ridgePath(rng, 170, 30, 6)
  const trees = treeRow(rng, 188, 9)

  return (
    <svg className="np-poster__scene" viewBox="0 0 320 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="214" fill={`url(#${gid})`} />
      <circle cx={sunX} cy="64" r="30" fill={palette.sun} />
      <circle cx={sunX} cy="64" r="40" fill="none" stroke={palette.sun} strokeOpacity="0.45" strokeWidth="2" />
      <circle cx={sunX} cy="64" r="50" fill="none" stroke={palette.sun} strokeOpacity="0.25" strokeWidth="2" />
      <path d={back} fill={palette.back} />
      <path d={mid} fill={palette.mid} />
      {hasLake && <rect x="0" y="176" width="320" height="14" fill={palette.sky[1]} opacity="0.55" />}
      <path d={front} fill={palette.front} />
      <rect x="0" y="188" width="320" height="26" fill={palette.ground} />
      <path d={trees} fill={palette.tree} />
    </svg>
  )
}

const CATEGORY_LABEL = {
  scenery: 'Scenery',
  visitorCenter: 'Visitor Ctr',
  facilities: 'Facilities',
  trails: 'Trails',
  roads: 'Roads',
}

function formatVisitedDate(visitedDate) {
  if (!visitedDate) return ''
  const date = new Date(`${visitedDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date).toUpperCase()
}

// Hand-provided poster art lives in public/posters/<key>.png, keyed by the park
// name with "national park" and punctuation stripped (e.g. "yosemite").
const LOCAL_POSTERS = new Set([
  'yosemite', 'joshuatree', 'sequoia', 'kingscanyon', 'hawaiivolcanoes', 'haleakala',
  'olympic', 'mountrainier', 'indianadunes', 'greatsmokymountains', 'cuyahogavalley',
  'zion', 'mammothcave', 'gatewayarch', 'everglades', 'grandcanyon',
])

function localPosterKey(name) {
  return (name || '')
    .toLowerCase()
    .replace(/national park.*/, '')
    .replace(/[^a-z]/g, '')
}

export function ParkPoster({ rank, ranking, preview = false }) {
  const total = calculateTotal(ranking.scores)
  const displayName = ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)
  const seed = hashString(ranking.parkCode || ranking.parkName || String(rank))
  const palette = PALETTES[seed % PALETTES.length]
  const subtitle = ranking.isCustom ? 'CUSTOM ENTRY' : 'NATIONAL PARK'
  const region = (ranking.state || '').toUpperCase()
  const visited = formatVisitedDate(ranking.visitedDate)

  // Poster image cascade: a hand-provided file at public/posters/<key>.png wins,
  // then a freely-licensed photo from Wikipedia, then the generated scene.
  const posterKey = localPosterKey(displayName)
  const overrideSrc = !ranking.isCustom && LOCAL_POSTERS.has(posterKey)
    ? `${import.meta.env.BASE_URL}posters/${posterKey}.png`
    : ''
  const [wikiSrc, setWikiSrc] = useState('')
  const [triedOverride, setTriedOverride] = useState(!overrideSrc)

  useEffect(() => {
    if (!triedOverride) return undefined
    let active = true
    const title = ranking.isCustom ? ranking.parkName : displayName
    if (!title) return undefined
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=800&titles=${encodeURIComponent(title)}&origin=*`
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        const pages = data?.query?.pages ?? {}
        const src = Object.values(pages)[0]?.thumbnail?.source
        if (src) setWikiSrc(src)
      })
      .catch(() => {})
    return () => { active = false }
  }, [displayName, ranking.isCustom, ranking.parkName, triedOverride])

  const shownSrc = triedOverride ? wikiSrc : overrideSrc
  const handlePhotoError = () => {
    if (!triedOverride) setTriedOverride(true)
    else setWikiSrc('')
  }

  return (
    <article className={`np-poster np-poster--${palette.id}`}>
      <div className="np-poster__art">
        <PosterScene uid={ranking.id || rank} palette={palette} seed={seed} />
        {shownSrc && (
          <img
            className="np-poster__photo"
            src={shownSrc}
            alt=""
            loading="lazy"
            onError={handlePhotoError}
          />
        )}
        <span className="np-poster__grain" aria-hidden="true" />
        <span className="np-poster__rank">{preview ? 'LIVE PREVIEW' : <>Nº&nbsp;{String(rank).padStart(2, '0')}</>}</span>
        {ranking.honorableMention && (
          <span className="np-poster__seal" title="Honorable mention">
            <Crown size={13} aria-hidden="true" />
            HONORABLE
          </span>
        )}
        <span className="np-poster__score">
          <strong>{total}</strong>
          <span>/100</span>
        </span>
      </div>

      <div className="np-poster__plate">
        <p className="np-poster__eyebrow">
          {subtitle}{region ? ` · ${region}` : ''}{visited ? ` · ${visited}` : ''}
        </p>
        <h3 className="np-poster__title">{displayName}</h3>

        <p className="np-poster__scorecap">Field scores · each out of 20</p>
        <div className="np-poster__ticks">
          {scoreCategories.map((category) => (
            <span className="np-tick" key={category.key}>
              <strong>{displayScore(ranking.scores[category.key])}</strong>
              <small>{CATEGORY_LABEL[category.key]}</small>
            </span>
          ))}
        </div>

        {ranking.notes && <p className="np-poster__notes">“{ranking.notes}”</p>}
      </div>
    </article>
  )
}

// Compact, clickable poster thumbnail for the editor's park picker.
export function ParkThumb({ ranking, isActive, onSelect }) {
  const displayName = ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)
  const total = calculateTotal(ranking.scores)
  const seed = hashString(ranking.parkCode || ranking.parkName || displayName)
  const palette = PALETTES[seed % PALETTES.length]
  const posterKey = localPosterKey(displayName)
  const overrideSrc = !ranking.isCustom && LOCAL_POSTERS.has(posterKey)
    ? `${import.meta.env.BASE_URL}posters/${posterKey}.png`
    : ''
  const [wikiSrc, setWikiSrc] = useState('')
  const [triedOverride, setTriedOverride] = useState(!overrideSrc)

  useEffect(() => {
    if (!triedOverride || ranking.isCustom || !displayName) return undefined
    let active = true
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=400&titles=${encodeURIComponent(displayName)}&origin=*`
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        const src = Object.values(data?.query?.pages ?? {})[0]?.thumbnail?.source
        if (src) setWikiSrc(src)
      })
      .catch(() => {})
    return () => { active = false }
  }, [displayName, ranking.isCustom, triedOverride])

  const shownSrc = triedOverride ? wikiSrc : overrideSrc
  const handleError = () => (triedOverride ? setWikiSrc('') : setTriedOverride(true))

  return (
    <button
      aria-selected={isActive}
      className={`park-thumb${isActive ? ' is-active' : ''}`}
      role="option"
      type="button"
      onClick={onSelect}
    >
      <span
        className="park-thumb__art"
        style={{ background: `linear-gradient(160deg, ${palette.sky[0]}, ${palette.front})` }}
      >
        {shownSrc && <img src={shownSrc} alt="" loading="lazy" onError={handleError} />}
        <span className="park-thumb__score">{total}</span>
        {ranking.honorableMention && <span className="park-thumb__seal">★</span>}
      </span>
      <span className="park-thumb__name">{displayName}</span>
      <span className="park-thumb__meta">{ranking.state || 'Custom'}</span>
    </button>
  )
}

/* ---------- section shell (data plumbing preserved) ---------------- */

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

function getSortableDate(ranking) {
  const date = ranking.visitedDate || ranking.updatedAt || ranking.createdAt
  const timestamp = new Date(date).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
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

function CanadaParkGuide() {
  return (
    <section className="canada-park-guide" aria-labelledby="canada-park-guide-title">
      <div className="section-header section-header--compact">
        <div>
          <p className="eyebrow">Reference list</p>
          <h3 id="canada-park-guide-title">Canadian parks on the radar</h3>
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

export function NationalParksSection({ activeScope = 'us', isLoading, loadError, rankings }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState('score')
  const [mentionFilter, setMentionFilter] = useState('all')

  // Hide the Canada / All views until at least one Canadian park is ranked.
  const hasCanadianRanking = useMemo(
    () => rankings.some((ranking) => getRankingCountry(ranking) === 'canada'),
    [rankings],
  )
  const effectiveScope = hasCanadianRanking ? activeScope : 'us'

  const filteredRankings = useMemo(
    () => filterRankingsByScope(rankings, effectiveScope),
    [effectiveScope, rankings],
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

  const showCanadaGuide = hasCanadianRanking && (effectiveScope === 'canada' || effectiveScope === 'all')
  const emptyCopy = effectiveScope === 'canada' ? 'No Canadian parks ranked yet.' : 'No parks ranked yet.'

  return (
    <main className="page page--parks">
      <section className="parks-gallery" aria-live="polite">
        <div className="parks-masthead">
          <p className="eyebrow">The park poster series</p>
          <h1>Ranked, framed &amp; hung on the wall.</h1>
          <p className="parks-masthead__note">
            Every park we&rsquo;ve walked, printed as its own field poster and scored out of 100 across
            scenery, visitor centers, facilities, trails, and roads.
          </p>
        </div>

        {hasCanadianRanking && (
          <nav className="parks-subnav glass-nav" aria-label="National parks views">
            {parkScopeLinks.map(([scope, label]) => (
              <a className={effectiveScope === scope ? 'is-active' : ''} href={`#/parks?scope=${scope}`} key={scope}>
                {label}
              </a>
            ))}
          </nav>
        )}

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
              <option value="date">Visited date</option>
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
          <div className="editor-empty-state glass-panel"><h2>Printing the posters…</h2></div>
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
          <div className="np-poster-grid">
            {visibleRows.map(({ rank, ranking }) => (
              <ParkPoster key={ranking.id} rank={rank} ranking={ranking} />
            ))}
          </div>
        )}

        {showCanadaGuide && <CanadaParkGuide />}
      </section>
    </main>
  )
}
