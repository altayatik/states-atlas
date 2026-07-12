export const scoreCategories = [
  { key: 'scenery', label: 'Scenery', shortLabel: 'scenery' },
  { key: 'visitorCenter', label: 'Visitor Center', shortLabel: 'visitor center' },
  { key: 'facilities', label: 'Facilities', shortLabel: 'facilities' },
  { key: 'trails', label: 'Trails', shortLabel: 'trails' },
  { key: 'roads', label: 'Roads', shortLabel: 'roads' },
]

export const defaultParkScores = {
  scenery: 8,
  visitorCenter: 7,
  facilities: 7,
  trails: 8,
  roads: 7,
}

export function normalizeScore(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 1
  }

  return Math.min(10, Math.max(1, Math.round(numericValue)))
}

export function normalizeScores(scores) {
  return scoreCategories.reduce((normalizedScores, category) => ({
    ...normalizedScores,
    [category.key]: normalizeScore(scores?.[category.key]),
  }), {})
}

// Scores are entered on a 1–10 scale per category, but the atlas presents them
// doubled: each category reads out of 20 and the total out of 100. Keeping the
// stored scale at 1–10 means every existing ranking converts proportionally
// (e.g. 37/50 → 74/100) with no data migration.
export const SCORE_DISPLAY_SCALE = 2
export const MAX_CATEGORY = 10 * SCORE_DISPLAY_SCALE
export const MAX_TOTAL = 50 * SCORE_DISPLAY_SCALE

export function displayScore(value) {
  return normalizeScore(value) * SCORE_DISPLAY_SCALE
}

export function calculateTotal(scores) {
  const raw = scoreCategories.reduce((total, category) => total + normalizeScore(scores?.[category.key]), 0)
  return raw * SCORE_DISPLAY_SCALE
}

export function calculateAverage(scores) {
  return calculateTotal(scores) / scoreCategories.length
}

export function getScoreTone(score) {
  const normalizedScore = normalizeScore(score)

  if (normalizedScore <= 3) {
    return { background: '#ffe1d5', color: '#d9583b', text: '#5f2216' }
  }

  if (normalizedScore <= 6) {
    return { background: '#fff0bc', color: '#d99a22', text: '#563a08' }
  }

  if (normalizedScore <= 8) {
    return { background: '#e8f4cf', color: '#81ad4d', text: '#243e16' }
  }

  return { background: '#d9f2df', color: '#257548', text: '#123421' }
}

export function getTopCategories(scores) {
  const normalizedScores = normalizeScores(scores)
  const topScore = Math.max(...scoreCategories.map((category) => normalizedScores[category.key]))
  const categories = scoreCategories.filter((category) => normalizedScores[category.key] === topScore)

  return { categories, topScore }
}

export function getBestForLabel(scores) {
  const { categories } = getTopCategories(scores)

  if (categories.length >= 4) return 'All-around standout'
  if (categories.length > 1) return `Best for ${categories.map((category) => category.shortLabel).join(' + ')}`
  if (categories[0].key === 'visitorCenter') return 'Best visitor center'

  return `Best for ${categories[0].shortLabel}`
}

export function sortRankings(rankings) {
  return [...rankings].sort((a, b) => {
    const totalDifference = calculateTotal(b.scores) - calculateTotal(a.scores)
    if (totalDifference !== 0) return totalDifference

    const bUpdatedAt = new Date(b.updatedAt || b.createdAt || 0).getTime()
    const aUpdatedAt = new Date(a.updatedAt || a.createdAt || 0).getTime()

    return bUpdatedAt - aUpdatedAt
  })
}

export function getRankedRows(rankings) {
  const sortedRankings = sortRankings(rankings)
  let previousTotal = null
  let previousRank = 0

  return sortedRankings.map((ranking, index) => {
    const total = calculateTotal(ranking.scores)
    const rank = total === previousTotal ? previousRank : index + 1
    previousTotal = total
    previousRank = rank

    return {
      isTied: sortedRankings.some((candidate) => candidate.id !== ranking.id && calculateTotal(candidate.scores) === total),
      rank,
      ranking,
    }
  })
}
