import { REGIONS } from '../data/states'

export const VISITED_STATUSES = new Set(['passed_through', 'visited', 'stayed_overnight', 'lived_there', 'favorite'])

export function isVisited(state) {
  return VISITED_STATUSES.has(state.status)
}

function countUniqueLoggedItems(states, field) {
  return new Set(states.flatMap((state) => state[field] ?? []).filter(Boolean)).size
}

export function getStats(states) {
  const visited = states.filter(isVisited)
  const stayed = states.filter((state) => ['stayed_overnight', 'lived_there', 'favorite'].includes(state.status))
  const favorites = states.filter((state) => state.status === 'favorite')
  const citiesLogged = countUniqueLoggedItems(states, 'citiesVisited')
  const parksMarked = countUniqueLoggedItems(states, 'parksVisited')
  const latestUpdated = states
    .filter((state) => state.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]

  return {
    statesVisited: visited.length,
    statesTotal: states.length,
    statesStayed: stayed.length,
    favorites: favorites.length,
    citiesLogged,
    parksMarked,
    completionPercent: (visited.length / states.length) * 100,
    latestUpdated,
  }
}

export function getRegionalProgress(states) {
  const byCode = new Map(states.map((state) => [state.code, state]))

  return Object.entries(REGIONS).map(([region, codes]) => {
    const visited = codes.filter((code) => isVisited(byCode.get(code))).length
    return {
      region,
      visited,
      total: codes.length,
      percent: (visited / codes.length) * 100,
    }
  })
}
