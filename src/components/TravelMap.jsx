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

const placeFillOpacity = [
  'case',
  ['boolean', ['get', 'selected'], false],
  0.42,
  ['boolean', ['get', 'visited'], false],
  0.28,
  0.16,
]

const placeLineWidth = [
  'case',
  ['boolean', ['get', 'selected'], false],
  2.4,
  ['boolean', ['get', 'visited'], false],
  1.7,
  1.1,
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function fitDefaultBounds(map) {
  map.fitBounds(DEFAULT_BOUNDS, {
    duration: prefersReducedMotion() ? 0 : 700,
    padding: 34,
  })
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
    features: metros.map((metro) => ({
      type: 'Feature',
      id: metro.id,
      properties: {
        id: metro.id,
        kind: 'metro',
        name: metro.name,
        selected: selectedPlaceType === 'metro' && selectedPlaceId === metro.id,
        visited: isMetroVisited(metro, states),
      },
      geometry: metro.geometry,
    })),
  }), [metros, selectedPlaceId, selectedPlaceType, states])

  const parksGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: parks.map((park) => ({
      type: 'Feature',
      id: park.id,
      properties: {
        id: park.id,
        kind: 'park',
        name: park.name,
        selected: selectedPlaceType === 'park' && selectedPlaceId === park.id,
        visited: isParkVisited(park, states),
      },
      geometry: park.geometry,
    })),
  }), [parks, selectedPlaceId, selectedPlaceType, states])

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
          'line-color': '#6c5643',
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 6, 1.4],
        },
      })

      map.addLayer({
        id: 'metros-fill',
        type: 'fill',
        source: 'metros',
        minzoom: 4,
        paint: {
          'fill-color': '#1f83a6',
          'fill-opacity': placeFillOpacity,
        },
      })

      map.addLayer({
        id: 'metros-line',
        type: 'line',
        source: 'metros',
        minzoom: 4,
        paint: {
          'line-color': '#214f57',
          'line-opacity': [
            'case',
            ['boolean', ['get', 'selected'], false],
            0.92,
            ['boolean', ['get', 'visited'], false],
            0.7,
            0.42,
          ],
          'line-width': placeLineWidth,
        },
      })

      map.addLayer({
        id: 'parks-fill',
        type: 'fill',
        source: 'parks',
        minzoom: 4.5,
        paint: {
          'fill-color': '#2f7a57',
          'fill-opacity': placeFillOpacity,
        },
      })

      map.addLayer({
        id: 'parks-line',
        type: 'line',
        source: 'parks',
        minzoom: 4.5,
        paint: {
          'line-color': '#2f7a57',
          'line-opacity': [
            'case',
            ['boolean', ['get', 'selected'], false],
            0.95,
            ['boolean', ['get', 'visited'], false],
            0.75,
            0.48,
          ],
          'line-width': placeLineWidth,
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

      map.on('click', 'metros-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        const metro = latestMapDataRef.current.metros.find((item) => item.id === id)
        if (metro) latestMapDataRef.current.onSelectMetro?.(metro)
      })

      map.on('click', 'parks-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        const park = latestMapDataRef.current.parks.find((item) => item.id === id)
        if (park) latestMapDataRef.current.onSelectPark?.(park)
      })

      map.on('click', 'states-fill', (event) => {
        const placeFeatures = map.queryRenderedFeatures(event.point, {
          layers: ['metros-fill', 'parks-fill'],
        })
        if (placeFeatures.length) return

        const code = event.features?.[0]?.properties?.code
        if (code) latestMapDataRef.current.onSelectState(code)
      })

      map.on('mousemove', 'states-fill', (event) => {
        const code = event.features?.[0]?.properties?.code
        if (code) setHoveredStateCode(code)
      })

      ;['states-fill', 'metros-fill', 'parks-fill'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
      })

      map.on('mouseleave', 'states-fill', () => {
        setHoveredStateCode('')
        map.getCanvas().style.cursor = ''
      })

      ;['metros-fill', 'parks-fill'].forEach((layerId) => {
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
