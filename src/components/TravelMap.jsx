import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import usAtlas from 'us-atlas/states-10m.json'
import canadaProvincesGeoJson from '../data/canadaProvinces.json'
import { CANADA_SUBDIVISION_CODE_BY_NAME, CANADA_SUBDIVISION_CODES } from '../data/canada'
import { fipsToStateCode, STATUS_COLORS } from '../data/states'
import { StatusLegend } from './StatusLegend'
import { isMetroVisited, isParkVisited } from '../utils/places'

const DEFAULT_BOUNDS = [
  [-170, 17],
  [-52, 72],
]

const SELECTED_VIEW_BOUNDS = {
  AK: [
    [-172, 51],
    [-129, 72],
  ],
  HI: [
    [-119, 20],
    [-105, 30],
  ],
}

const MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'atlas-paper',
      type: 'background',
      paint: {
        'background-color': '#f4ead8',
      },
    },
  ],
}

const STATUS_COLOR_EXPRESSION = [
  'match',
  ['get', 'status'],
  'not_visited',
  STATUS_COLORS.not_visited,
  'passed_through',
  STATUS_COLORS.passed_through,
  'visited',
  STATUS_COLORS.visited,
  'stayed_overnight',
  STATUS_COLORS.stayed_overnight,
  'lived_there',
  STATUS_COLORS.lived_there,
  'favorite',
  STATUS_COLORS.favorite,
  STATUS_COLORS.not_visited,
]

const stateFillOpacity = [
  'case',
  ['boolean', ['get', 'selected'], false],
  0.98,
  ['boolean', ['get', 'hasSelection'], false],
  0.54,
  0.94,
]

const HAWAII_SOURCE_CENTER = [-157.35, 20.75]
const HAWAII_DISPLAY_CENTER = [-124, 29.5]
const HAWAII_DISPLAY_SCALE = 1.9
const canadianSubdivisionCodes = new Set(CANADA_SUBDIVISION_CODES)

function transformHawaiiCoordinate(coordinate) {
  const [lng, lat] = coordinate
  return [
    HAWAII_DISPLAY_CENTER[0] + (lng - HAWAII_SOURCE_CENTER[0]) * HAWAII_DISPLAY_SCALE,
    HAWAII_DISPLAY_CENTER[1] + (lat - HAWAII_SOURCE_CENTER[1]) * HAWAII_DISPLAY_SCALE,
  ]
}

function transformGeometryCoordinates(coordinates, transformCoordinate) {
  if (!Array.isArray(coordinates?.[0])) return transformCoordinate(coordinates)
  return coordinates.map((item) => transformGeometryCoordinates(item, transformCoordinate))
}

function transformHawaiiGeometry(geometry) {
  return {
    ...geometry,
    coordinates: transformGeometryCoordinates(geometry.coordinates, transformHawaiiCoordinate),
  }
}

// Alaska renders from its true geometry in its real location (next to the
// Yukon). Only Hawaii is drawn as a small inset, since it has no land neighbor.
function transformInsetCoordinate(coordinate, stateCodes = []) {
  if (stateCodes.includes('HI')) return transformHawaiiCoordinate(coordinate)
  return coordinate
}

function getGeometryCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Point') return [geometry.coordinates]
  if (geometry.type === 'Polygon') return geometry.coordinates.flat()
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2)
  return []
}

function getGeometryCenter(geometry) {
  const coordinates = getGeometryCoordinates(geometry).filter((coordinate) => (
    Array.isArray(coordinate)
    && Number.isFinite(coordinate[0])
    && Number.isFinite(coordinate[1])
  ))
  if (!coordinates.length) return null

  const bounds = coordinates.reduce((acc, [lng, lat]) => ({
    minLng: Math.min(acc.minLng, lng),
    maxLng: Math.max(acc.maxLng, lng),
    minLat: Math.min(acc.minLat, lat),
    maxLat: Math.max(acc.maxLat, lat),
  }), {
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  })

  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ]
}

function getGeometryBounds(geometry) {
  const coordinates = getGeometryCoordinates(geometry).filter((coordinate) => (
    Array.isArray(coordinate)
    && Number.isFinite(coordinate[0])
    && Number.isFinite(coordinate[1])
  ))
  if (!coordinates.length) return null

  return coordinates.reduce((acc, [lng, lat]) => ([
    [Math.min(acc[0][0], lng), Math.min(acc[0][1], lat)],
    [Math.max(acc[1][0], lng), Math.max(acc[1][1], lat)],
  ]), [
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  ])
}

// Parse the US topology and pre-transform the Alaska/Hawaii insets ONCE at
// module load — this is pure and static, so it never needs to run per render.
const US_BASE_FEATURES = feature(usAtlas, usAtlas.objects.states).features
  .map((item) => {
    const code = fipsToStateCode[item.id]
    if (!code) return null
    const geometry = code === 'HI' ? transformHawaiiGeometry(item.geometry) : item.geometry
    return { code, geometry }
  })
  .filter(Boolean)

function buildPlaceFeature(item, type, states, selectedPlaceType, selectedPlaceId, selectedStateCode) {
  const selected = selectedPlaceType === type && selectedPlaceId === item.id
  const visited = type === 'metro'
    ? isMetroVisited(item, states)
    : isParkVisited(item, states)
  const stateSelected = item.stateCodes?.includes(selectedStateCode)
  const isCanadianPlace = item.country === 'canada' || item.stateCodes?.some((code) => canadianSubdivisionCodes.has(code))
  const sourceCenter = getGeometryCenter(item.geometry)
  const center = sourceCenter
    ? transformInsetCoordinate(sourceCenter, item.stateCodes)
    : sourceCenter
  // Only ever pin places we've actually been to (plus whatever is actively selected).
  if (!selected && !visited) return null
  if (!center) return null

  return {
    center,
    item,
    selected,
    stateSelected: Boolean(stateSelected) && !isCanadianPlace,
    type,
    visited,
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function getMapPadding(element, mode = 'default') {
  const width = element?.clientWidth ?? window.innerWidth
  const isMobile = width < 940

  if (mode === 'selected') {
    return isMobile
      ? { bottom: 32, left: 26, right: 26, top: 32 }
      : { bottom: 54, left: 60, right: 60, top: 54 }
  }

  return isMobile
    ? { bottom: 22, left: 18, right: 18, top: 22 }
    : { bottom: 44, left: 56, right: 56, top: 44 }
}

function fitDefaultBounds(map, element) {
  map.fitBounds(DEFAULT_BOUNDS, {
    duration: prefersReducedMotion() ? 0 : 700,
    maxZoom: 3.2,
    padding: getMapPadding(element),
  })
}

function fitInsetStateBounds(map, code, element) {
  const bounds = SELECTED_VIEW_BOUNDS[code]
  if (!bounds) return

  map.fitBounds(bounds, {
    duration: prefersReducedMotion() ? 0 : 750,
    maxZoom: 4.5,
    padding: getMapPadding(element, 'selected'),
  })
}

function fitFeatureBounds(map, featureItem, element) {
  const bounds = getGeometryBounds(featureItem?.geometry)
  if (!bounds) return false

  map.fitBounds(bounds, {
    duration: prefersReducedMotion() ? 0 : 720,
    maxZoom: 4.9,
    padding: getMapPadding(element, 'selected'),
  })

  return true
}

function syncViewportDataset(map, element) {
  if (!element) return

  const center = map.getCenter()
  element.dataset.centerLng = center.lng.toFixed(4)
  element.dataset.centerLat = center.lat.toFixed(4)
  element.dataset.zoom = map.getZoom().toFixed(2)
}

export function TravelMap({
  metros = [],
  parks = [],
  selectedPlace,
  states,
  selectedStateCode,
  onSelectMetro,
  onSelectPark,
  onSelectState,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const placeMarkersRef = useRef([])
  const latestMapDataRef = useRef({})
  const hoveredIdRef = useRef('')
  const [isMapReady, setIsMapReady] = useState(false)
  // Bucketed zoom (0 = framed, 1 = pins, 2 = pins + labels) so markers only
  // rebuild when crossing a threshold, not on every zoom frame.
  const [zoomBucket, setZoomBucket] = useState(0)

  const stateByCode = useMemo(() => new Map(states.map((state) => [state.code, state])), [states])
  const selectedPlaceId = selectedPlace?.item?.id ?? ''
  const selectedPlaceType = selectedPlace?.type ?? ''

  const canadaFeatures = useMemo(() => {
    return canadaProvincesGeoJson.features.map((item) => {
      const provinceName = item.properties?.name ?? 'Canada'
      const provinceCode = CANADA_SUBDIVISION_CODE_BY_NAME[provinceName] ?? provinceName.toUpperCase().slice(0, 2)
      const province = stateByCode.get(provinceCode)
      if (!province) return null

      return {
        type: 'Feature',
        id: provinceCode,
        properties: {
          code: provinceCode,
          name: province.name,
          status: province.status,
          selected: selectedStateCode === provinceCode,
          hasSelection: Boolean(selectedStateCode),
        },
        geometry: item.geometry,
      }
    }).filter(Boolean)
  }, [selectedStateCode, stateByCode])

  const statesGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      ...canadaFeatures,
      ...US_BASE_FEATURES.map(({ code, geometry }) => {
        const state = stateByCode.get(code)
        if (!state) return null

        return {
          type: 'Feature',
          id: code,
          properties: {
            code,
            name: state.name,
            status: state.status,
            selected: selectedStateCode === code,
            hasSelection: Boolean(selectedStateCode),
          },
          geometry,
        }
      }).filter(Boolean),
    ],
  }), [canadaFeatures, selectedStateCode, stateByCode])

  const placeFeatures = useMemo(() => [
    ...metros
      .map((metro) => buildPlaceFeature(metro, 'metro', states, selectedPlaceType, selectedPlaceId, selectedStateCode))
      .filter(Boolean),
    ...parks
      .map((park) => buildPlaceFeature(park, 'park', states, selectedPlaceType, selectedPlaceId, selectedStateCode))
      .filter(Boolean),
  ], [metros, parks, selectedPlaceId, selectedPlaceType, selectedStateCode, states])

  useEffect(() => {
    latestMapDataRef.current = {
      metros,
      onSelectMetro,
      onSelectPark,
      onSelectState,
      parks,
      statesGeoJson,
    }
  }, [metros, onSelectMetro, onSelectPark, onSelectState, parks, statesGeoJson])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
      center: [-96, 38],
      container: mapContainerRef.current,
      doubleClickZoom: true,
      dragPan: true,
      dragRotate: false,
      keyboard: true,
      maxBounds: [
        [-180, -16],
        [-45, 73],
      ],
      maxZoom: 8.5,
      minZoom: 1.05,
      pitchWithRotate: false,
      scrollZoom: true,
      style: MAP_STYLE,
      touchPitch: false,
      touchZoomRotate: true,
    })

    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({
      showCompass: false,
      showZoom: true,
      visualizePitch: false,
    }), 'top-left')

    const syncViewport = () => syncViewportDataset(map, mapContainerRef.current)
    const resizeMap = () => {
      map.resize()
      syncViewport()
    }
    const resizeObserver = new ResizeObserver(resizeMap)
    resizeObserver.observe(mapContainerRef.current)
    window.addEventListener('resize', resizeMap)

    map.on('load', () => {
      const latest = latestMapDataRef.current

      map.addSource('states', { type: 'geojson', data: latest.statesGeoJson, promoteId: 'code' })
      map.addLayer({
        id: 'states-fill',
        type: 'fill',
        source: 'states',
        paint: {
          'fill-color': STATUS_COLOR_EXPRESSION,
          'fill-opacity': stateFillOpacity,
        },
      })

      map.addLayer({
        id: 'states-line',
        type: 'line',
        source: 'states',
        paint: {
          'line-color': '#54677f',
          'line-opacity': 0.42,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 6, 1.4],
        },
      })

      map.addLayer({
        id: 'hovered-state-line',
        type: 'line',
        source: 'states',
        paint: {
          'line-color': '#c46a45',
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 6, 3.2],
        },
      })

      map.addLayer({
        id: 'selected-state-line',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'line-color': '#6f4f35',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.2, 6, 4.2],
        },
      })

      map.on('click', 'states-fill', (event) => {
        const properties = event.features?.[0]?.properties
        const code = properties?.code
        if (code) latestMapDataRef.current.onSelectState(code)
      })

      const setHover = (code) => {
        if (hoveredIdRef.current === code) return
        if (hoveredIdRef.current) {
          map.setFeatureState({ source: 'states', id: hoveredIdRef.current }, { hover: false })
        }
        hoveredIdRef.current = code
        if (code) map.setFeatureState({ source: 'states', id: code }, { hover: true })
      }

      map.on('mousemove', 'states-fill', (event) => {
        const code = event.features?.[0]?.properties?.code
        if (code) setHover(code)
      })

      map.on('mouseenter', 'states-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'states-fill', () => {
        setHover('')
        map.getCanvas().style.cursor = ''
      })

      fitDefaultBounds(map, mapContainerRef.current)
      syncViewport()
      setIsMapReady(true)
    })

    const computeZoomBucket = (z) => (z >= 4.85 ? 2 : z >= 4.15 ? 1 : 0)
    map.on('zoom', () => {
      setZoomBucket((current) => {
        const next = computeZoomBucket(map.getZoom())
        return next === current ? current : next
      })
      syncViewport()
    })

    map.on('move', syncViewport)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', resizeMap)
      placeMarkersRef.current.forEach((marker) => marker.remove())
      placeMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    map.getSource('states')?.setData(statesGeoJson)
  }, [isMapReady, statesGeoJson])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady || !selectedStateCode) return

    if (SELECTED_VIEW_BOUNDS[selectedStateCode]) {
      fitInsetStateBounds(map, selectedStateCode, mapContainerRef.current)
      return
    }

    // Read the latest features from the ref so this effect only refits when
    // the selection itself changes (hover updates rebuild statesGeoJson and
    // previously kept snapping the camera back, locking the zoom).
    const features = latestMapDataRef.current.statesGeoJson?.features ?? []
    const selectedFeature = features.find((item) => item.properties?.code === selectedStateCode)
    fitFeatureBounds(map, selectedFeature, mapContainerRef.current)
  }, [isMapReady, selectedStateCode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    placeMarkersRef.current.forEach((marker) => marker.remove())
    placeMarkersRef.current = []

    placeFeatures.forEach((place) => {
      const showPin = place.selected || place.stateSelected || zoomBucket >= 1
      if (!showPin) return

      const showLabel = place.selected || place.stateSelected || zoomBucket >= 2
      const button = document.createElement('button')
      button.type = 'button'
      button.className = [
        'place-marker',
        `place-marker--${place.type}`,
        showLabel ? 'place-marker--labeled' : '',
        place.selected ? 'is-selected' : '',
      ].filter(Boolean).join(' ')
      button.setAttribute('aria-label', `Select ${place.item.name}`)
      button.innerHTML = `
        <span class="place-marker__dot" aria-hidden="true">${place.type === 'park' ? '▲' : ''}</span>
        <span class="place-marker__label">${place.item.name}</span>
      `
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        if (place.type === 'park') onSelectPark?.(place.item)
        else onSelectMetro?.(place.item)
      })

      const marker = new maplibregl.Marker({
        anchor: 'center',
        element: button,
      }).setLngLat(place.center).addTo(map)
      placeMarkersRef.current.push(marker)
    })
  }, [isMapReady, zoomBucket, onSelectMetro, onSelectPark, placeFeatures])

  const handleResetMap = () => {
    const map = mapRef.current
    if (map) fitDefaultBounds(map, mapContainerRef.current)
    onSelectState?.('')
  }

  return (
    <>
      <div className="atlas-map">
        <div
          ref={mapContainerRef}
          className="maplibre-atlas"
          data-canada-feature-count={canadaFeatures.length}
          data-canada-feature-codes={canadaFeatures.map((item) => item.properties.code).join(' ')}
          aria-label="Gesture-driven United States travel map"
        />

        <button className="atlas-map__reset" type="button" onClick={handleResetMap}>
          Reset map
        </button>
      </div>

      <div className="atlas-legend-bar">
        <StatusLegend />
      </div>
    </>
  )
}
