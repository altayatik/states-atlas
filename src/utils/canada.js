import { CANADA_PLACE_PROVINCES, CANADA_SUBDIVISIONS } from '../data/canada'
import { normalizePlaceName } from './places'

const provinceCodes = new Set(CANADA_SUBDIVISIONS.map(([code]) => code))
const provinceCodesByName = new Map(
  CANADA_SUBDIVISIONS.map(([code, name]) => [normalizePlaceName(name), code]),
)

const provinceNamesByPlace = new Map(
  Object.entries(CANADA_PLACE_PROVINCES).map(([place, codes]) => [normalizePlaceName(place), codes]),
)

export function getCanadianProvinceCodesForPlaces(places = []) {
  const result = new Set()

  places.forEach((place) => {
    const normalizedPlace = normalizePlaceName(place)
    const codes = provinceNamesByPlace.get(normalizedPlace) ?? [provinceCodesByName.get(normalizedPlace)].filter(Boolean)

    codes.forEach((code) => {
      if (provinceCodes.has(code)) result.add(code)
    })
  })

  return [...result]
}

export function getCanadaProgress(canada) {
  const visitedCodes = getCanadianProvinceCodesForPlaces([
    ...(canada?.citiesVisited ?? []),
    ...(canada?.parksVisited ?? []),
  ])

  return {
    percent: (visitedCodes.length / CANADA_SUBDIVISIONS.length) * 100,
    region: 'Canada',
    total: CANADA_SUBDIVISIONS.length,
    visited: visitedCodes.length,
    visitedCodes,
  }
}
