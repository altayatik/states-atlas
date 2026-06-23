const METRO_ALIASES = {
  'sf-bay-area': ['San Francisco'],
  'new-york-city': ['New York'],
}

export function normalizePlaceName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\bnational park\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

export function getMetroNameOptions(metro) {
  return uniqueValues([
    metro?.name,
    ...(METRO_ALIASES[metro?.id] ?? []),
  ])
}

export function getParkNameOptions(park) {
  const name = park?.name ?? ''
  return uniqueValues([
    name,
    name.replace(/\s+National Park$/i, ''),
  ])
}

function getStateEntries(states, stateCodes = []) {
  const codes = new Set(stateCodes)
  return states.filter((state) => codes.has(state.code))
}

function hasLoggedName(entries, field, names) {
  const loggedNames = new Set(
    entries
      .flatMap((state) => state[field] ?? [])
      .map(normalizePlaceName),
  )

  return names.some((name) => loggedNames.has(normalizePlaceName(name)))
}

export function isMetroVisited(metro, states) {
  return hasLoggedName(
    getStateEntries(states, metro?.stateCodes),
    'citiesVisited',
    getMetroNameOptions(metro),
  )
}

export function isParkVisited(park, states) {
  return hasLoggedName(
    getStateEntries(states, park?.stateCodes),
    'parksVisited',
    getParkNameOptions(park),
  )
}

export function getRelatedStateNames(stateCodes = [], states = []) {
  const stateByCode = new Map(states.map((state) => [state.code, state.name]))
  return stateCodes.map((code) => stateByCode.get(code) ?? code)
}
