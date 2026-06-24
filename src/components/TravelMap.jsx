import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import { Minus, Plus, RotateCcw } from 'lucide-react'
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

const placePinOpacity = [
  'case',
  ['boolean', ['get', 'selected'], false],
  1,
  ['boolean', ['get', 'stateSelected'], false],
  0.96,
  0.92,
]

const placeLabelOpacity = [
  'case',
  ['boolean', ['get', 'selected'], false],
  1,
  0.92,
]

const focusedPlaceFilter = [
  'any',
  ['==', ['get', 'selected'], true],
  ['==', ['get', 'stateSelected'], true],
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
      <svg aria-hidden="true" className="map-inset__shape map-inset__shape--hi" viewBox="0 0 140 82">
        <path d="M18 27 C24 21 34 21 39 27 C36 32 26 34 18 27 Z" />
        <path d="M45 35 C54 29 66 32 70 39 C63 45 51 43 45 35 Z" />
        <path d="M73 45 C83 38 98 41 104 50 C96 59 81 56 73 45 Z" />
        <path d="M108 56 C119 48 134 53 137 64 C126 73 112 68 108 56 Z" />
        <circle cx="33" cy="48" r="3.2" />
        <circle cx="60" cy="55" r="2.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="map-inset__shape map-inset__shape--ak" viewBox="0 0 140 82">
      <path d="M14 44 L26 24 L51 13 L74 14 L93 24 L119 29 L126 42 L113 52 L88 55 L68 50 L55 58 L38 69 L28 61 L20 65 L15 56 Z" />
      <path className="map-inset__islands" d="M49 67 C59 69 67 70 75 72 M82 72 C89 74 95 75 101 75 M108 73 C116 75 123 75 131 74" />
      <path className="map-inset__cutline" d="M26 25 C45 35 68 33 90 24" />
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
  const latestMapDataRef = useRef({})
  const [isMapReady, setIsMapReady] = useState(false)
  const [hoveredStateCode, setHoveredStateCode] = useState('')

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

  const metrosGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: metros.map((metro) => {
      const selected = selectedPlaceType === 'metro' && selectedPlaceId === metro.id
      const visited = isMetroVisited(metro, states)
      const stateSelected = metro.stateCodes?.includes(selectedStateCode)
      const center = getGeometryCenter(metro.geometry)
      if (!selected && !visited) return null
      if (!center) return null

      return {
        type: 'Feature',
        id: metro.id,
        properties: {
          id: metro.id,
          kind: 'metro',
          name: metro.name,
          selected,
          stateSelected,
          visited,
        },
        geometry: {
          type: 'Point',
          coordinates: center,
        },
      }
    }).filter(Boolean),
  }), [metros, selectedPlaceId, selectedPlaceType, selectedStateCode, states])

  const parksGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: parks.map((park) => {
      const selected = selectedPlaceType === 'park' && selectedPlaceId === park.id
      const visited = isParkVisited(park, states)
      const stateSelected = park.stateCodes?.includes(selectedStateCode)
      const center = getGeometryCenter(park.geometry)
      if (!selected && !visited) return null
      if (!center) return null

      return {
        type: 'Feature',
        id: park.id,
        properties: {
          id: park.id,
          kind: 'park',
          name: park.name,
          selected,
          stateSelected,
          visited,
        },
        geometry: {
          type: 'Point',
          coordinates: center,
        },
      }
    }).filter(Boolean),
  }), [parks, selectedPlaceId, selectedPlaceType, selectedStateCode, states])

  useEffect(() => {
    latestMapDataRef.current = {
      metros,
      metrosGeoJson,
      onSelectMetro,
      onSelectPark,
      onSelectState,
      parks,
      parksGeoJson,
      statesGeoJson,
    }
  }, [metros, metrosGeoJson, onSelectMetro, onSelectPark, onSelectState, parks, parksGeoJson, statesGeoJson])

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
      map.addSource('metros', { type: 'geojson', data: latest.metrosGeoJson, promoteId: 'id' })
      map.addSource('parks', { type: 'geojson', data: latest.parksGeoJson, promoteId: 'id' })

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
        id: 'metros-pin',
        type: 'circle',
        source: 'metros',
        minzoom: 4.35,
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#ff8f85',
            '#76c8ff',
          ],
          'circle-opacity': placePinOpacity,
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            8,
            ['boolean', ['get', 'stateSelected'], false],
            6.8,
            6,
          ],
          'circle-stroke-color': '#fffaf0',
          'circle-stroke-opacity': placePinOpacity,
          'circle-stroke-width': 2.2,
        },
      })

      map.addLayer({
        id: 'metros-pin-focus',
        type: 'circle',
        source: 'metros',
        filter: focusedPlaceFilter,
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#ff8f85',
            '#76c8ff',
          ],
          'circle-opacity': placePinOpacity,
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            8,
            6.8,
          ],
          'circle-stroke-color': '#fffaf0',
          'circle-stroke-opacity': placePinOpacity,
          'circle-stroke-width': 2.2,
        },
      })

      map.addLayer({
        id: 'parks-pin',
        type: 'circle',
        source: 'parks',
        minzoom: 4.55,
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#6bd6a1',
            '#a8e6c3',
          ],
          'circle-opacity': placePinOpacity,
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            9,
            ['boolean', ['get', 'stateSelected'], false],
            7.2,
            6.8,
          ],
          'circle-stroke-color': '#32694b',
          'circle-stroke-opacity': placePinOpacity,
          'circle-stroke-width': 1.9,
        },
      })

      map.addLayer({
        id: 'parks-pin-focus',
        type: 'circle',
        source: 'parks',
        filter: focusedPlaceFilter,
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#6bd6a1',
            '#a8e6c3',
          ],
          'circle-opacity': placePinOpacity,
          'circle-radius': [
            'case',
            ['boolean', ['get', 'selected'], false],
            9,
            7.2,
          ],
          'circle-stroke-color': '#32694b',
          'circle-stroke-opacity': placePinOpacity,
          'circle-stroke-width': 1.9,
        },
      })

      map.addLayer({
        id: 'parks-pin-icon',
        type: 'symbol',
        source: 'parks',
        minzoom: 4.55,
        layout: {
          'text-allow-overlap': true,
          'text-field': '▲',
          'text-ignore-placement': true,
          'text-size': [
            'case',
            ['boolean', ['get', 'selected'], false],
            11,
            9,
          ],
        },
        paint: {
          'text-color': '#32694b',
          'text-opacity': placePinOpacity,
        },
      })

      map.addLayer({
        id: 'parks-pin-icon-focus',
        type: 'symbol',
        source: 'parks',
        filter: focusedPlaceFilter,
        layout: {
          'text-allow-overlap': true,
          'text-field': '▲',
          'text-ignore-placement': true,
          'text-size': [
            'case',
            ['boolean', ['get', 'selected'], false],
            11,
            9,
          ],
        },
        paint: {
          'text-color': '#32694b',
          'text-opacity': placePinOpacity,
        },
      })

      map.addLayer({
        id: 'metros-label',
        type: 'symbol',
        source: 'metros',
        minzoom: 5.2,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'top',
          'text-field': ['get', 'name'],
          'text-ignore-placement': false,
          'text-offset': [0, 0.9],
          'text-optional': true,
          'text-size': ['interpolate', ['linear'], ['zoom'], 5.2, 11, 7, 12.5],
        },
        paint: {
          'text-color': '#24556d',
          'text-halo-color': '#fffaf0',
          'text-halo-width': 1.4,
          'text-opacity': placeLabelOpacity,
        },
      })

      map.addLayer({
        id: 'parks-label',
        type: 'symbol',
        source: 'parks',
        minzoom: 5.7,
        layout: {
          'text-allow-overlap': false,
          'text-anchor': 'top',
          'text-field': ['get', 'name'],
          'text-ignore-placement': false,
          'text-offset': [0, 0.95],
          'text-optional': true,
          'text-size': ['interpolate', ['linear'], ['zoom'], 5.7, 10.5, 7.4, 12],
        },
        paint: {
          'text-color': '#32694b',
          'text-halo-color': '#fffaf0',
          'text-halo-width': 1.4,
          'text-opacity': placeLabelOpacity,
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
          'line-color': '#2d241e',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.2, 6, 4.2],
        },
      })

      const handleMetroClick = (event) => {
        const id = event.features?.[0]?.properties?.id
        const metro = latestMapDataRef.current.metros.find((item) => item.id === id)
        if (metro) latestMapDataRef.current.onSelectMetro?.(metro)
      }

      const handleParkClick = (event) => {
        const id = event.features?.[0]?.properties?.id
        const park = latestMapDataRef.current.parks.find((item) => item.id === id)
        if (park) latestMapDataRef.current.onSelectPark?.(park)
      }

      ;['metros-pin', 'metros-pin-focus', 'metros-label'].forEach((layerId) => {
        map.on('click', layerId, handleMetroClick)
      })

      ;['parks-pin', 'parks-pin-focus', 'parks-pin-icon', 'parks-pin-icon-focus', 'parks-label'].forEach((layerId) => {
        map.on('click', layerId, handleParkClick)
      })

      map.on('click', 'states-fill', (event) => {
        const placeFeatures = map.queryRenderedFeatures(event.point, {
          layers: ['metros-pin', 'metros-pin-focus', 'parks-pin', 'parks-pin-focus', 'parks-pin-icon', 'parks-pin-icon-focus'],
        })
        if (placeFeatures.length) return

        const code = event.features?.[0]?.properties?.code
        if (code) latestMapDataRef.current.onSelectState(code)
      })

      map.on('mousemove', 'states-fill', (event) => {
        const code = event.features?.[0]?.properties?.code
        if (code) setHoveredStateCode(code)
      })

      ;['states-fill', 'metros-pin', 'metros-pin-focus', 'parks-pin', 'parks-pin-focus', 'parks-pin-icon', 'parks-pin-icon-focus'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
      })

      map.on('mouseleave', 'states-fill', () => {
        setHoveredStateCode('')
        map.getCanvas().style.cursor = ''
      })

      ;['metros-pin', 'metros-pin-focus', 'parks-pin', 'parks-pin-focus', 'parks-pin-icon', 'parks-pin-icon-focus'].forEach((layerId) => {
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      })

      fitDefaultBounds(map)
      setIsMapReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    map.getSource('states')?.setData(statesGeoJson)
    map.getSource('metros')?.setData(metrosGeoJson)
    map.getSource('parks')?.setData(parksGeoJson)
  }, [isMapReady, metrosGeoJson, parksGeoJson, statesGeoJson])

  const resetView = () => {
    if (mapRef.current) fitDefaultBounds(mapRef.current)
  }

  const zoomBy = (delta) => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({
      duration: prefersReducedMotion() ? 0 : 220,
      zoom: map.getZoom() + delta,
    })
  }

  return (
    <section className="map-card map-card--central" aria-labelledby="map-title">
      <div className="section-heading map-heading">
        <div>
          <p className="eyebrow">State atlas</p>
          <h2 id="map-title">Explore the map</h2>
        </div>
        <div className="map-controls" aria-label="Map controls">
          <button aria-label="Zoom out" type="button" onClick={() => zoomBy(-0.7)}>
            <Minus size={17} aria-hidden="true" />
          </button>
          <button aria-label="Reset map view" type="button" onClick={resetView}>
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button aria-label="Zoom in" type="button" onClick={() => zoomBy(0.7)}>
            <Plus size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="map-hint">Pinch or scroll to explore. Zoom in to reveal cities and parks.</p>

      <div className="map-shell map-shell--maplibre">
        <div ref={mapContainerRef} className="maplibre-atlas" aria-label="Gesture-driven United States travel map" />
        <div className="map-insets" aria-label="Alaska and Hawaii insets">
          {insetStates.map((state) => (
            <button
              aria-label={`Select ${state.name}`}
              className={state.code === selectedStateCode ? 'map-inset is-selected' : 'map-inset'}
              key={state.code}
              style={{ '--state-color': STATUS_COLORS[state.status] }}
              type="button"
              onClick={() => onSelectState(state.code)}
            >
              <InsetSilhouette code={state.code} />
              <span>{state.code}</span>
              <small>{state.name}</small>
            </button>
          ))}
        </div>
      </div>

      <StatusLegend />
    </section>
  )
}
