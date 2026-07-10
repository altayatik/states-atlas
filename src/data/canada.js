export const CANADA_CODE = 'CAN'

export const CANADA_SUBDIVISIONS = [
  ['AB', 'Alberta'],
  ['BC', 'British Columbia'],
  ['MB', 'Manitoba'],
  ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'],
  ['NS', 'Nova Scotia'],
  ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'],
  ['ON', 'Ontario'],
  ['PE', 'Prince Edward Island'],
  ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'],
  ['YT', 'Yukon'],
]

export const CANADA_SUBDIVISION_CODE_BY_NAME = Object.fromEntries(
  CANADA_SUBDIVISIONS.flatMap(([code, name]) => [
    [name, code],
    [name === 'Yukon' ? 'Yukon Territory' : name, code],
  ]),
)

export const CANADA_SUBDIVISION_NAME_BY_CODE = Object.fromEntries(CANADA_SUBDIVISIONS)

export const CANADA_SUBDIVISION_CODES = CANADA_SUBDIVISIONS.map(([code]) => code)

export const CANADA_PLACE_PROVINCES = {
  'Auyuittuq National Park': ['NU'],
  'Banff National Park': ['AB'],
  Calgary: ['AB'],
  'Bruce Peninsula National Park': ['ON'],
  'Cape Breton Highlands National Park': ['NS'],
  'Fundy National Park': ['NB'],
  'Gros Morne National Park': ['NL'],
  'Jasper National Park': ['AB'],
  'Kootenay National Park': ['BC'],
  'Kluane National Park and Reserve': ['YT'],
  'La Mauricie National Park': ['QC'],
  Montreal: ['QC'],
  'Mount Revelstoke National Park': ['BC'],
  'Nahanni National Park Reserve': ['NT'],
  'Pacific Rim National Park Reserve': ['BC'],
  'Prince Edward Island National Park': ['PE'],
  'Terra Nova National Park': ['NL'],
  'Thousand Islands National Park': ['ON'],
  Toronto: ['ON'],
  Vancouver: ['BC'],
  'Waterton Lakes National Park': ['AB'],
  'Wood Buffalo National Park': ['AB', 'NT'],
  'Yoho National Park': ['BC'],
}

export const canadianProvinceEntries = CANADA_SUBDIVISIONS.map(([code, name]) => ({
  code,
  name,
  kind: ['NT', 'NU', 'YT'].includes(code) ? 'territory' : 'province',
  status: 'not_visited',
  firstVisitedYear: '',
  favoriteMemory: '',
  badges: [],
  vibeRating: 0,
  honorableMention: false,
  citiesVisited: [],
  parksVisited: [],
  updatedAt: '',
}))
