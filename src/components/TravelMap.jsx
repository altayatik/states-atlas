import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import usAtlas from 'us-atlas/states-10m.json'
import { fipsToStateCode, STATUS_COLORS } from '../data/states'
import { StatusLegend } from './StatusLegend'

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
  0.38,
  0.94,
]

const metroOpacity = [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  ['case', ['boolean', ['get', 'focused'], false], 0.2, 0.035],
  5,
  ['case', ['boolean', ['get', 'focused'], false], 0.38, 0.15],
  7,
  ['case', ['boolean', ['get', 'focused'], false], 0.5, 0.3],
]

const parkOpacity = [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  ['case', ['boolean', ['get', 'focused'], false], 0.18, 0.025],
  5,
  ['case', ['boolean', ['get', 'focused'], false], 0.34, 0.13],
  7,
  ['case', ['boolean', ['get', 'focused'], false], 0.46, 0.26],
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function atlasInsetCoordinate(coordinate, code) {
  const [lng, lat] = coordinate

  if (code === 'AK') {
    return [-123.3 + (lng + 152) * 0.24, 25.8 + (lat - 64) * 0.24]
  }

  if (code === 'HI') {
    return [-109.5 + (lng + 157.8) * 1.15, 24.6 + (lat - 20.8) * 1.15]
  }

  return coordinate
}

function transformCoordinates(coordinates, code) {
  if (typeof coordinates[0] === 'number') return atlasInsetCoordinate(coordinates, code)
  return coordinates.map((item) => transformCoordinates(item, code))
}

function getGeometryCenter(geometry) {
  const points = []

  const collectPoints = (coordinates) => {
    if (typeof coordinates[0] === 'number') {
      points.push(coordinates)
      return
    }
    coordinates.forEach(collectPoints)
  }

  collectPoints(geometry.coordinates)

  const total = points.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0],
  )

  return [total[0] / points.length, total[1] / points.length]
}

function setLayerVisibility(map, layerIds, isVisible) {
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none')
    }
  })
}

function fitDefaultBounds(map) {
  map.fitBounds(DEFAULT_BOUNDS, {
    duration: prefersReducedMotion() ? 0 : 700,
    padding: 34,
  })
}

export function TravelMap({
  states,
  metros,
  parks,
  selectedStateCode,
  selectedMapItem,
  onSelectState,
  onSelectMetro,
  onSelectPark,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const labelsRef = useRef([])
  const latestMapDataRef = useRef({})
  const [isMapReady, setIsMapReady] = useState(false)
  const [showStates, setShowStates] = useState(true)
  const [showCities, setShowCities] = useState(true)
  const [showParks, setShowParks] = useState(true)

  const statesGeoJson = useMemo(() => {
    const stateByCode = new Map(states.map((state) => [state.code, state]))

    return {
      type: 'FeatureCollection',
      features: feature(usAtlas, usAtlas.objects.states).features
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
              hasSelection: Boolean(selectedStateCode),
            },
            geometry: {
              ...item.geometry,
              coordinates: transformCoordinates(item.geometry.coordinates, code),
            },
          }
        })
        .filter(Boolean),
    }
  }, [selectedStateCode, states])

  const metrosGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: metros.map((metro) => ({
      type: 'Feature',
      id: metro.id,
      properties: {
        id: metro.id,
        name: metro.name,
        stateCodes: metro.stateCodes.join(', '),
        status: metro.status,
        selected: selectedMapItem?.type === 'metro' && selectedMapItem.id === metro.id,
        focused: metro.stateCodes.includes(selectedStateCode) || selectedMapItem?.id === metro.id,
      },
      geometry: metro.geometry,
    })),
  }), [metros, selectedMapItem, selectedStateCode])

  const parksGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: parks.map((park) => ({
      type: 'Feature',
      id: park.id,
      properties: {
        id: park.id,
        name: park.name,
        stateCodes: park.stateCodes.join(', '),
        visited: park.visited,
        selected: selectedMapItem?.type === 'park' && selectedMapItem.id === park.id,
        focused: park.stateCodes.includes(selectedStateCode) || selectedMapItem?.id === park.id,
      },
      geometry: park.geometry,
    })),
  }), [parks, selectedMapItem, selectedStateCode])

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
        paint: {
          'fill-color': '#1f83a6',
          'fill-opacity': metroOpacity,
        },
      })

      map.addLayer({
        id: 'metros-line',
        type: 'line',
        source: 'metros',
        paint: {
          'line-color': ['case', ['boolean', ['get', 'selected'], false], '#b43d2d', '#1f5f78'],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.25, 5, 0.68, 7, 0.9],
          'line-width': ['case', ['boolean', ['get', 'selected'], false], 3.2, 1.7],
        },
      })

      map.addLayer({
        id: 'parks-fill',
        type: 'fill',
        source: 'parks',
        paint: {
          'fill-color': '#89b77f',
          'fill-opacity': parkOpacity,
        },
      })

      map.addLayer({
        id: 'parks-line',
        type: 'line',
        source: 'parks',
        paint: {
          'line-color': ['case', ['boolean', ['get', 'selected'], false], '#f2bf45', '#2f7a57'],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.28, 5, 0.72, 7, 0.92],
          'line-width': ['case', ['boolean', ['get', 'selected'], false], 3.2, 1.8],
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

      map.on('click', 'states-fill', (event) => {
        const placeFeatures = map.queryRenderedFeatures(event.point, {
          layers: ['metros-fill', 'parks-fill'],
        })
        if (placeFeatures.length) return

        const code = event.features?.[0]?.properties?.code
        if (code) latestMapDataRef.current.onSelectState(code)
      })

      map.on('click', 'metros-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        const metro = latestMapDataRef.current.metros.find((item) => item.id === id)
        if (metro) latestMapDataRef.current.onSelectMetro(metro)
      })

      map.on('click', 'parks-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        const park = latestMapDataRef.current.parks.find((item) => item.id === id)
        if (park) latestMapDataRef.current.onSelectPark(park)
      })

      ;['states-fill', 'metros-fill', 'parks-fill'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      })

      fitDefaultBounds(map)
      setIsMapReady(true)
    })

    return () => {
      labelsRef.current.forEach((marker) => marker.remove())
      labelsRef.current = []
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    setLayerVisibility(map, ['states-fill', 'states-line', 'selected-state-line'], showStates)
    setLayerVisibility(map, ['metros-fill', 'metros-line'], showCities)
    setLayerVisibility(map, ['parks-fill', 'parks-line'], showParks)
  }, [isMapReady, showCities, showParks, showStates])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return undefined

    labelsRef.current.forEach((marker) => marker.remove())
    labelsRef.current = []

    const makeLabel = (item, type) => {
      const element = document.createElement('span')
      element.className = `map-label map-label--${type}`
      element.textContent = item.name.replace(' National Park', '')
      const marker = new maplibregl.Marker({ element })
        .setLngLat(getGeometryCenter(item.geometry))
        .addTo(map)

      labelsRef.current.push(marker)
      return { element, item, marker, type }
    }

    const labels = [
      ...metros.map((item) => makeLabel(item, 'metro')),
      ...parks.map((item) => makeLabel(item, 'park')),
    ]

    const syncLabels = () => {
      const zoom = map.getZoom()
      labels.forEach(({ element, item, type }) => {
        const isSelected = selectedMapItem?.id === item.id
        const isFocused = item.stateCodes.includes(selectedStateCode) || isSelected
        const layerVisible = type === 'metro' ? showCities : showParks
        element.hidden = !layerVisible || (!isFocused && zoom < 5.2)
      })
    }

    syncLabels()
    map.on('zoom', syncLabels)
    map.on('move', syncLabels)

    return () => {
      map.off('zoom', syncLabels)
      map.off('move', syncLabels)
      labelsRef.current.forEach((marker) => marker.remove())
      labelsRef.current = []
    }
  }, [isMapReady, metros, parks, selectedMapItem, selectedStateCode, showCities, showParks])

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
          <p className="eyebrow">Explore mode</p>
          <h2 id="map-title">Altay & Aidi&apos;s Road Atlas</h2>
          <p className="map-subtitle">A living map of states, cities, parks, and favorite memories.</p>
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

      <div className="map-toolbar">
        <div className="layer-toggles" aria-label="Map layers">
          <label>
            <input checked={showStates} type="checkbox" onChange={(event) => setShowStates(event.target.checked)} />
            States
          </label>
          <label>
            <input checked={showCities} type="checkbox" onChange={(event) => setShowCities(event.target.checked)} />
            Cities
          </label>
          <label>
            <input checked={showParks} type="checkbox" onChange={(event) => setShowParks(event.target.checked)} />
            Parks
          </label>
        </div>
        <p>Pinch or scroll to explore. Zoom in to reveal cities and parks.</p>
      </div>

      <div className="map-shell map-shell--maplibre">
        <div ref={mapContainerRef} className="maplibre-atlas" aria-label="Gesture-driven United States travel map" />
      </div>

      {selectedMapItem && (
        <aside className="map-callout" aria-live="polite">
          <strong>{selectedMapItem.name}</strong>
          <span>
            {selectedMapItem.type === 'metro'
              ? `${selectedMapItem.stateCodes.join(', ')} metro outline`
              : `${selectedMapItem.stateCodes.join(', ')} park outline`}
          </span>
        </aside>
      )}

      <StatusLegend />
    </section>
  )
}
