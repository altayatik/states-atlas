import { achievements } from '../data/achievements'
import { isVisited } from './stats'

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
  const visitedCodes = new Set(states.filter(isVisited).map((state) => state.code))
  const favoriteCount = states.filter((state) => state.status === 'favorite').length

  return achievements.map((achievement) => {
    let unlocked = false
    let progress = 0
    let total = achievement.threshold ?? achievement.requiredStates?.length ?? 1

    if (achievement.type === 'states') {
      progress = achievement.requiredStates.filter((code) => visitedCodes.has(code)).length
      unlocked = progress === achievement.requiredStates.length
    }

    if (achievement.type === 'count') {
      progress = visitedCodes.size
      unlocked = visitedCodes.size >= achievement.threshold
    }

    if (achievement.type === 'favorites') {
      progress = favoriteCount
      unlocked = favoriteCount >= achievement.threshold
    }

    if (achievement.type === 'contiguous') {
      progress = contiguousStates.filter((code) => isVisited(stateByCode.get(code))).length
      total = contiguousStates.length
      unlocked = progress === contiguousStates.length
    }

    return {
      ...achievement,
      unlocked,
      progress: Math.min(progress, total),
      total,
    }
  })
}
