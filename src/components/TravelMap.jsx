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

function InsetSilhouette({ code }) {
  if (code === 'HI') {
    return (
      <svg aria-hidden="true" className="state-inset__shape state-inset__shape--hi" viewBox="0 0 210 92">
        <path d="M20 29 C26 22 38 21 46 27 C42 36 28 38 20 29 Z" />
        <path d="M57 39 C66 30 82 31 91 40 C84 51 66 51 57 39 Z" />
        <path d="M102 52 C114 41 135 43 146 56 C136 70 114 68 102 52 Z" />
        <path d="M155 64 C166 55 184 57 194 69 C183 82 164 79 155 64 Z" />
        <ellipse cx="49" cy="54" rx="3.8" ry="2.8" transform="rotate(-12 49 54)" />
        <ellipse cx="82" cy="61" rx="4" ry="3" transform="rotate(10 82 61)" />
        <ellipse cx="132" cy="78" rx="3" ry="2.2" transform="rotate(-8 132 78)" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="state-inset__shape state-inset__shape--ak" viewBox="0 0 236 118">
      <path d="M15 65 L30 43 L27 30 L47 24 L70 12 L101 15 L121 27 L151 29 L176 39 L216 47 L225 63 L207 76 L170 78 L144 87 L111 77 L83 86 L57 106 L42 91 L24 99 L18 82 Z" />
      <path className="state-inset__cutline" d="M39 31 C75 52 128 49 166 33" />
      <circle className="state-inset__island" cx="80" cy="103" r="3.4" />
      <circle className="state-inset__island" cx="99" cy="108" r="3" />
      <circle className="state-inset__island" cx="119" cy="111" r="2.8" />
      <circle className="state-inset__island" cx="141" cy="112" r="2.5" />
      <circle className="state-inset__island" cx="164" cy="110" r="2.3" />
      <circle className="state-inset__island" cx="188" cy="105" r="2" />
      <circle className="state-inset__island" cx="210" cy="99" r="1.8" />
    </svg>
  )
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
        <div className="state-inset-group" aria-label="Alaska and Hawaii map insets">
          {insetStates.map((state) => (
            <button
              aria-label={`Select ${state.name}`}
              className={[
                'state-inset',
                `state-inset--${state.code.toLowerCase()}`,
                state.code === selectedStateCode ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              key={state.code}
              style={{ '--state-color': STATUS_COLORS[state.status] }}
              type="button"
              onClick={() => onSelectState(state.code)}
            >
              <InsetSilhouette code={state.code} />
              <span className="state-inset__code">{state.code}</span>
              <span className="state-inset__name">{state.name}</span>
            </button>
          ))}
        </div>
      </div>

      <StatusLegend />
    </section>
  )
}
