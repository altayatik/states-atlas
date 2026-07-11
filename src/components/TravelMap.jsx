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
  [-146, 22],
  [-52, 59],
]

const SELECTED_VIEW_BOUNDS = {
  AK: [
    [-146, 29],
    [-130, 40],
  ],
  HI: [
    [-130, 22],
    [-118, 30],
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
        'background-color': '#e9f1f7',
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
const HAWAII_DISPLAY_CENTER = [-124.15, 25.55]
const HAWAII_DISPLAY_SCALE = 2.1
const ALASKA_SOURCE_CENTER = [-152.4, 63.6]
const ALASKA_DISPLAY_CENTER = [-138.3, 34.7]
const ALASKA_DISPLAY_SCALE = 0.34
const canadianSubdivisionCodes = new Set(CANADA_SUBDIVISION_CODES)

function transformAlaskaCoordinate(coordinate) {
  const [lng, lat] = coordinate
  return [
    ALASKA_DISPLAY_CENTER[0] + (lng - ALASKA_SOURCE_CENTER[0]) * ALASKA_DISPLAY_SCALE,
    ALASKA_DISPLAY_CENTER[1] + (lat - ALASKA_SOURCE_CENTER[1]) * ALASKA_DISPLAY_SCALE,
  ]
}

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

function transformAlaskaGeometry(geometry) {
  return {
    ...geometry,
    coordinates: transformGeometryCoordinates(geometry.coordinates, transformAlaskaCoordinate),
  }
}

function transformInsetCoordinate(coordinate, stateCodes = []) {
  if (stateCodes.includes('AK')) return transformAlaskaCoordinate(coordinate)
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

function buildPlaceFeature(item, type, states, selectedPlaceType, selectedPlaceId, selectedStateCode) {
  const selected = selectedPlaceType === type && selectedPlaceId === item.id
  const visited = type === 'metro'
    ? isMetroVisited(item, states)
    : isParkVisited(item, states)
  const stateSelected = item.stateCodes?.includes(selectedStateCode)
  const isCanadianPlace = item.country === 'canada' || item.stateCodes?.some((code) => canadianSubdivisionCodes.has(code))
  const canShowForSelectedState = stateSelected && !isCanadianPlace
  const sourceCenter = getGeometryCenter(item.geometry)
  const center = sourceCenter
    ? transformInsetCoordinate(sourceCenter, item.stateCodes)
    : sourceCenter
  if (!selected && !visited && !canShowForSelectedState) return null
  if (!center) return null

  return {
    center,
    item,
    selected,
    stateSelected: canShowForSelectedState,
    type,
    visited,
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function getMapPadding(element, mode = 'default') {
  const width = element?.clientWidth ?? window.innerWidth
  const isMobile = width < 680

  if (mode === 'selected') {
    return isMobile
      ? { bottom: 34, left: 26, right: 26, top: 34 }
      : { bottom: 58, left: 70, right: 70, top: 58 }
  }

  return isMobile
    ? { bottom: 24, left: 16, right: 16, top: 24 }
    : { bottom: 42, left: 52, right: 52, top: 42 }
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
  const [isMapReady, setIsMapReady] = useState(false)
  const [hoveredStateCode, setHoveredStateCode] = useState('')
  const [mapZoom, setMapZoom] = useState(0)

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
          hovered: hoveredStateCode === provinceCode,
          hasSelection: Boolean(selectedStateCode),
        },
        geometry: item.geometry,
      }
    }).filter(Boolean)
  }, [hoveredStateCode, selectedStateCode, stateByCode])

  const statesGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      ...canadaFeatures,
      ...feature(usAtlas, usAtlas.objects.states).features
      .map((item) => {
        const code = fipsToStateCode[item.id]
        const state = stateByCode.get(code)
        if (!code || !state) return null

        return {
          type: 'Feature',
          id: code,
          properties: {
            code,
            name: state.name,
            status: state.status,
            selected: selectedStateCode === code,
            hovered: hoveredStateCode === code,
            hasSelection: Boolean(selectedStateCode),
          },
          geometry: code === 'AK'
            ? transformAlaskaGeometry(item.geometry)
            : code === 'HI'
              ? transformHawaiiGeometry(item.geometry)
              : item.geometry,
        }
      })
      .filter(Boolean),
    ].filter(Boolean),
  }), [canadaFeatures, hoveredStateCode, selectedStateCode, stateByCode])

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
    }), 'top-right')

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
          'line-opacity': 0.55,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 6, 1.4],
        },
      })

      map.addLayer({
        id: 'hovered-state-line',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'hovered'], true],
        paint: {
          'line-color': '#c46a45',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 6, 3.2],
        },
      })

      map.addLayer({
        id: 'selected-state-line',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'line-color': '#1c2c44',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.2, 6, 4.2],
        },
      })

      map.on('click', 'states-fill', (event) => {
        const properties = event.features?.[0]?.properties
        const code = properties?.code
        if (code) latestMapDataRef.current.onSelectState(code)
      })

      map.on('mousemove', 'states-fill', (event) => {
        const code = event.features?.[0]?.properties?.code
        if (code) setHoveredStateCode(code)
      })

      map.on('mouseenter', 'states-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'states-fill', () => {
        setHoveredStateCode('')
        map.getCanvas().style.cursor = ''
      })

      fitDefaultBounds(map, mapContainerRef.current)
      setMapZoom(map.getZoom())
      syncViewport()
      setIsMapReady(true)
    })

    map.on('zoom', () => {
      setMapZoom(map.getZoom())
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

    const selectedFeature = statesGeoJson.features.find((item) => item.properties?.code === selectedStateCode)
    fitFeatureBounds(map, selectedFeature, mapContainerRef.current)
  }, [isMapReady, selectedStateCode, statesGeoJson])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    placeMarkersRef.current.forEach((marker) => marker.remove())
    placeMarkersRef.current = []

    placeFeatures.forEach((place) => {
      const showPin = place.selected || place.stateSelected || mapZoom >= 4.15
      if (!showPin) return

      const showLabel = place.selected || place.stateSelected || mapZoom >= 4.85
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
        anchor: 'bottom',
        element: button,
      }).setLngLat(place.center).addTo(map)
      placeMarkersRef.current.push(marker)
    })
  }, [isMapReady, mapZoom, onSelectMetro, onSelectPark, placeFeatures])

  const selectedStateName = stateByCode.get(selectedStateCode)?.name
  const handleResetMap = () => {
    const map = mapRef.current
    if (map) fitDefaultBounds(map, mapContainerRef.current)
    onSelectState?.('')
  }

  return (
    <section className="map-card map-card--central glass-panel" aria-labelledby="map-title">
      <div className="section-header map-heading">
        <div>
          <p className="eyebrow">State atlas</p>
          <h2 id="map-title">Explore the map</h2>
        </div>
        <button className="button button--secondary button--small" type="button" onClick={handleResetMap}>
          Reset map
        </button>
      </div>

      <p className="map-hint">Pinch or scroll to explore. Zoom in to reveal cities and parks.</p>

      <div className="map-shell map-shell--maplibre">
        <div className="map-overlay-panel glass-panel" aria-live="polite">
          <strong>{selectedStateName || 'North America framed'}</strong>
          <span>{selectedStateName ? 'Selected state fitted' : 'Pins appear as you zoom or select a state'}</span>
        </div>
        <div
          ref={mapContainerRef}
          className="maplibre-atlas"
          data-canada-feature-count={canadaFeatures.length}
          data-canada-feature-codes={canadaFeatures.map((item) => item.properties.code).join(' ')}
          aria-label="Gesture-driven United States travel map"
        />
      </div>

      <StatusLegend />
    </section>
  )
}
