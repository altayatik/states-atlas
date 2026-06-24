import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import usAtlas from 'us-atlas/states-10m.json'
import { fipsToStateCode, STATUS_COLORS } from '../data/states'
import { StatusLegend } from './StatusLegend'
import { isMetroVisited, isParkVisited } from '../utils/places'

const DEFAULT_BOUNDS = [
  [-127, 23],
  [-66, 51],
]

const MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'atlas-paper',
      type: 'background',
      paint: {
        'background-color': '#fff3df',
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

function buildPlaceFeature(item, type, states, selectedPlaceType, selectedPlaceId, selectedStateCode) {
  const selected = selectedPlaceType === type && selectedPlaceId === item.id
  const visited = type === 'metro'
    ? isMetroVisited(item, states)
    : isParkVisited(item, states)
  const stateSelected = item.stateCodes?.includes(selectedStateCode)
  const center = getGeometryCenter(item.geometry)
  if (!selected && !visited) return null
  if (!center) return null

  return {
    center,
    item,
    selected,
    stateSelected,
    type,
    visited,
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function fitDefaultBounds(map) {
  map.fitBounds(DEFAULT_BOUNDS, {
    duration: prefersReducedMotion() ? 0 : 700,
    padding: 34,
  })
}

function AlaskaMiniMap() {
  return (
    <svg aria-hidden="true" className="state-inset-shape state-inset-shape--alaska" viewBox="0 0 220 140">
      {/* Broad western mainland + Arctic coast */}
      <path d="M34 18 L56 10 L80 14 L98 9 L116 16 L126 28 L118 40 L130 38 L140 50 L128 60 L108 56 L94 66 L78 60 L64 68 L48 60 L34 50 L24 36 L26 24 Z" />
      {/* Southeast panhandle suggestion, trailing down-right from the mainland */}
      <path d="M118 40 L138 56 L148 76 L156 96 L150 114 L138 110 L130 90 L116 66 L110 50 Z" />
      {/* Alaska Peninsula tapering southwest toward the Aleutians */}
      <path d="M64 68 L50 76 L36 82 L24 86 L14 88 L20 78 L34 72 L48 64 Z" />
      {/* Aleutian island chain: many small dots trailing further southwest */}
      <circle className="state-inset-island" cx="6" cy="90" r="2.6" />
      <circle className="state-inset-island" cx="-6" cy="94" r="2.2" />
      <circle className="state-inset-island" cx="-17" cy="99" r="1.9" />
      <circle className="state-inset-island" cx="-27" cy="105" r="1.6" />
      <circle className="state-inset-island" cx="-36" cy="112" r="1.3" />
    </svg>
  )
}

function HawaiiMiniMap() {
  return (
    <svg aria-hidden="true" className="state-inset-shape state-inset-shape--hawaii" viewBox="0 0 160 90">
      {/* Kauai - small, northwest end of the chain */}
      <path className="state-inset-island" d="M16 16 C22 10 31 11 34 18 C37 25 31 30 23 28 C16 26 12 21 16 16 Z" />
      {/* Oahu */}
      <path className="state-inset-island" d="M42 26 C50 20 61 22 64 30 C67 38 58 43 48 40 C40 37 37 31 42 26 Z" />
      {/* Maui (with Molokai/Lanai suggested as the same cluster) */}
      <path className="state-inset-island" d="M70 39 C80 32 94 35 98 45 C101 54 90 59 78 56 C69 53 64 45 70 39 Z" />
      {/* Big Island - largest, lower/right */}
      <path className="state-inset-island" d="M104 53 C122 44 144 51 150 68 C155 83 136 89 116 85 C99 81 92 67 99 58 C100 56 102 54 104 53 Z" />
    </svg>
  )
}

const INSET_COMPONENTS = {
  AK: AlaskaMiniMap,
  HI: HawaiiMiniMap,
}

const INSET_SLUG = {
  AK: 'alaska',
  HI: 'hawaii',
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
  const insetStates = useMemo(() => states.filter((state) => ['AK', 'HI'].includes(state.code)), [states])
  const selectedPlaceId = selectedPlace?.item?.id ?? ''
  const selectedPlaceType = selectedPlace?.type ?? ''

  const statesGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: feature(usAtlas, usAtlas.objects.states).features
      .map((item) => {
        const code = fipsToStateCode[item.id]
        const state = stateByCode.get(code)
        if (!code || !state || code === 'AK' || code === 'HI') return null

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
          geometry: item.geometry,
        }
      })
      .filter(Boolean),
  }), [hoveredStateCode, selectedStateCode, stateByCode])

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
        [-132, 18],
        [-62, 55],
      ],
      maxZoom: 8.5,
      minZoom: 2.45,
      pitchWithRotate: false,
      scrollZoom: true,
      style: MAP_STYLE,
      touchPitch: false,
      touchZoomRotate: true,
    })

    mapRef.current = map

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
          'line-color': '#6f6048',
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 6, 1.4],
        },
      })

      map.addLayer({
        id: 'hovered-state-line',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'hovered'], true],
        paint: {
          'line-color': '#b43d2d',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 6, 3.2],
        },
      })

      map.addLayer({
        id: 'selected-state-line',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'line-color': '#24384f',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.2, 6, 4.2],
        },
      })

      map.on('click', 'states-fill', (event) => {
        const code = event.features?.[0]?.properties?.code
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

      fitDefaultBounds(map)
      setMapZoom(map.getZoom())
      setIsMapReady(true)
    })

    map.on('zoom', () => {
      setMapZoom(map.getZoom())
    })

    return () => {
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
    if (!map || !isMapReady) return

    placeMarkersRef.current.forEach((marker) => marker.remove())
    placeMarkersRef.current = []

    placeFeatures.forEach((place) => {
      const showPin = place.selected || place.stateSelected || mapZoom >= 3.55
      if (!showPin) return

      const showLabel = place.selected || place.stateSelected || mapZoom >= 4.35
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

  return (
    <section className="map-card map-card--central" aria-labelledby="map-title">
      <div className="section-heading map-heading">
        <div>
          <p className="eyebrow">State atlas</p>
          <h2 id="map-title">Explore the map</h2>
        </div>
      </div>

      <p className="map-hint">Pinch or scroll to explore. Zoom in to reveal cities and parks.</p>

      <div className="map-shell map-shell--maplibre">
        <div ref={mapContainerRef} className="maplibre-atlas" aria-label="Gesture-driven United States travel map" />
        <div className="state-insets" aria-label="Alaska and Hawaii map insets">
          {insetStates.map((state) => {
            const InsetMap = INSET_COMPONENTS[state.code]
            if (!InsetMap) return null

            return (
              <button
                aria-label={`Select ${state.name}`}
                className={[
                  'state-inset',
                  `state-inset--${INSET_SLUG[state.code]}`,
                  state.code === selectedStateCode ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
                key={state.code}
                style={{ '--state-color': STATUS_COLORS[state.status] }}
                type="button"
                onClick={() => onSelectState(state.code)}
              >
                <InsetMap />
                <span className="state-inset-label">
                  <span className="state-inset-label__code">{state.code}</span>
                  <span className="state-inset-label__name">{state.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <StatusLegend />
    </section>
  )
}
