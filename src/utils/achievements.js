import { achievements } from '../data/achievements'
import { CANADA_SUBDIVISION_CODES, CANADA_SUBDIVISIONS } from '../data/canada'
import { REGIONS } from '../data/states'
import { getCanadianProvinceCodesForPlaces } from './canada'
import { isPlaceOptionSelected } from './places'
import { isVisited } from './stats'

const STAYED_STATUSES = new Set(['stayed_overnight', 'lived_there', 'favorite'])

const contiguousStates = [
  'AL',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

export function evaluateAchievements(states) {
  const stateByCode = new Map(states.map((state) => [state.code, state]))
  const usStates = states.filter((state) => state.kind === 'state')
  const canadianCodes = new Set(CANADA_SUBDIVISION_CODES)
  const canadianEntries = states.filter((state) => canadianCodes.has(state.code))
  const visitedCodes = new Set(states.filter(isVisited).map((state) => state.code))
  const visitedUsCodes = new Set(usStates.filter(isVisited).map((state) => state.code))
  const favoriteCount = usStates.filter((state) => state.status === 'favorite').length
  const cityCount = new Set(states.flatMap((state) => state.citiesVisited ?? []).filter(Boolean)).size
  const parkCount = new Set(states.flatMap((state) => state.parksVisited ?? []).filter(Boolean)).size
  const legacyCanada = stateByCode.get('CAN')
  const canadaSubdivisionNames = CANADA_SUBDIVISIONS.map(([, name]) => name)
  const visitedCanadianCodes = new Set(canadianEntries.filter(isVisited).map((state) => state.code))
  getCanadianProvinceCodesForPlaces([
    ...(legacyCanada?.citiesVisited ?? []),
    ...(legacyCanada?.parksVisited ?? []),
  ]).forEach((code) => visitedCanadianCodes.add(code))
  const canadaSubdivisionCount = visitedCanadianCodes.size
  const canadaCityCount = new Set(
    [
      ...canadianEntries.flatMap((state) => state.citiesVisited ?? []),
      ...(legacyCanada?.citiesVisited ?? []),
    ].filter((city) => !isPlaceOptionSelected(canadaSubdivisionNames, city)),
  ).size
  const canadaParkCount = new Set([
    ...canadianEntries.flatMap((state) => state.parksVisited ?? []),
    ...(legacyCanada?.parksVisited ?? []),
  ].filter(Boolean)).size

  return achievements.map((achievement) => {
    let unlocked = false
    let progress = 0
    let total = achievement.threshold ?? achievement.requiredStates?.length ?? 1

    if (achievement.type === 'states') {
      progress = achievement.requiredStates.filter((code) => visitedCodes.has(code)).length
      unlocked = progress === achievement.requiredStates.length
    }

    if (achievement.type === 'count') {
      progress = visitedUsCodes.size
      unlocked = visitedUsCodes.size >= achievement.threshold
    }

    if (achievement.type === 'favorites') {
      progress = favoriteCount
      unlocked = favoriteCount >= achievement.threshold
    }

    if (achievement.type === 'cities') {
      progress = cityCount
      unlocked = cityCount >= achievement.threshold
    }

    if (achievement.type === 'parks') {
      progress = parkCount
      unlocked = parkCount >= achievement.threshold
    }

    if (achievement.type === 'canada_parks') {
      progress = canadaParkCount
      unlocked = canadaParkCount >= achievement.threshold
    }

    if (achievement.type === 'canada_subdivisions') {
      progress = canadaSubdivisionCount
      unlocked = canadaSubdivisionCount >= achievement.threshold
    }

    if (achievement.type === 'canada_cities') {
      progress = canadaCityCount
      unlocked = canadaCityCount >= achievement.threshold
    }

    if (achievement.type === 'region') {
      const codes = REGIONS[achievement.region] ?? []
      progress = codes.filter((code) => isVisited(stateByCode.get(code))).length
      unlocked = progress >= achievement.threshold
    }

    if (achievement.type === 'stayed') {
      progress = usStates.filter((state) => STAYED_STATUSES.has(state.status)).length
      unlocked = progress >= achievement.threshold
    }

    if (achievement.type === 'lived') {
      progress = usStates.filter((state) => state.status === 'lived_there').length
      unlocked = progress >= achievement.threshold
    }

    if (achievement.type === 'contiguous') {
      progress = contiguousStates.filter((code) => isVisited(stateByCode.get(code))).length
      total = contiguousStates.length
      unlocked = progress === contiguousStates.length
    }

    if (achievement.type === 'all_states') {
      progress = visitedUsCodes.size
      total = usStates.length
      unlocked = progress === usStates.length
    }

    return {
      ...achievement,
      unlocked,
      progress: Math.min(progress, total),
      total,
      progressText: `${Math.min(progress, total)}/${total}`,
    }
  })
}
