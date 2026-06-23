// Simplified visual park outlines for the MVP; these can later be replaced with official NPS boundary data.
export const parkBoundaries = [
  {
    id: 'yosemite',
    name: 'Yosemite National Park',
    stateCodes: ['CA'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-119.95, 37.45],
        [-119.15, 37.45],
        [-119.1, 38.15],
        [-119.85, 38.12],
        [-119.95, 37.45],
      ]],
    },
  },
  {
    id: 'zion',
    name: 'Zion National Park',
    stateCodes: ['UT'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-113.25, 37.05],
        [-112.82, 37.05],
        [-112.78, 37.45],
        [-113.22, 37.48],
        [-113.25, 37.05],
      ]],
    },
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon National Park',
    stateCodes: ['AZ'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-113.05, 35.75],
        [-111.55, 35.78],
        [-111.48, 36.45],
        [-112.98, 36.5],
        [-113.05, 35.75],
      ]],
    },
  },
  {
    id: 'yellowstone',
    name: 'Yellowstone National Park',
    stateCodes: ['WY', 'MT', 'ID'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-111.25, 44.05],
        [-109.85, 44.05],
        [-109.82, 45.12],
        [-111.15, 45.15],
        [-111.25, 44.05],
      ]],
    },
  },
  {
    id: 'acadia',
    name: 'Acadia National Park',
    stateCodes: ['ME'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-68.55, 44.2],
        [-68.1, 44.2],
        [-68.08, 44.55],
        [-68.52, 44.58],
        [-68.55, 44.2],
      ]],
    },
  },
  {
    id: 'joshua-tree',
    name: 'Joshua Tree National Park',
    stateCodes: ['CA'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-116.45, 33.65],
        [-115.55, 33.65],
        [-115.5, 34.18],
        [-116.35, 34.2],
        [-116.45, 33.65],
      ]],
    },
  },
  {
    id: 'rocky-mountain',
    name: 'Rocky Mountain National Park',
    stateCodes: ['CO'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-105.9, 40.15],
        [-105.45, 40.15],
        [-105.42, 40.55],
        [-105.88, 40.58],
        [-105.9, 40.15],
      ]],
    },
  },
  {
    id: 'olympic',
    name: 'Olympic National Park',
    stateCodes: ['WA'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-124.0, 47.45],
        [-123.1, 47.45],
        [-123.0, 48.2],
        [-123.9, 48.2],
        [-124.0, 47.45],
      ]],
    },
  },
  {
    id: 'great-smoky-mountains',
    name: 'Great Smoky Mountains National Park',
    stateCodes: ['TN', 'NC'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-84.05, 35.35],
        [-83.0, 35.35],
        [-82.95, 35.85],
        [-84.0, 35.9],
        [-84.05, 35.35],
      ]],
    },
  },
  {
    id: 'everglades',
    name: 'Everglades National Park',
    stateCodes: ['FL'],
    visited: true,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-81.35, 25.05],
        [-80.25, 25.02],
        [-80.2, 25.75],
        [-81.25, 25.85],
        [-81.35, 25.05],
      ]],
    },
  },
]
