import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import usAtlas from 'us-atlas/states-10m.json'
import { fipsToStateCode, STATUS_COLORS } from '../data/states'
import { cities as cityData } from '../data/cities'
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
  ['case', ['boolean', ['get', 'focused'], false], 0.2, ['boolean', ['get', 'active'], false], 0.09, 0.018],
  5,
  ['case', ['boolean', ['get', 'focused'], false], 0.38, ['boolean', ['get', 'active'], false], 0.22, 0.08],
  7,
  ['case', ['boolean', ['get', 'focused'], false], 0.5, ['boolean', ['get', 'active'], false], 0.34, 0.18],
]

const parkOpacity = [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  ['case', ['boolean', ['get', 'focused'], false], 0.18, ['boolean', ['get', 'visited'], false], 0.08, 0.016],
  5,
  ['case', ['boolean', ['get', 'focused'], false], 0.34, ['boolean', ['get', 'visited'], false], 0.2, 0.07],
  7,
  ['case', ['boolean', ['get', 'focused'], false], 0.46, ['boolean', ['get', 'visited'], false], 0.32, 0.16],
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
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

function normalizeName(value = '') {
  return value
    .toLowerCase()
    .replace(/\bnational park\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getLoggedItemsForStates(stateByCode, stateCodes, field) {
  return stateCodes.flatMap((code) => stateByCode.get(code)?.[field] ?? [])
}

function isMetroLogged(metro, stateByCode) {
  const loggedCities = getLoggedItemsForStates(stateByCode, metro.stateCodes, 'citiesVisited').map(normalizeName)
  if (!loggedCities.length) return false

  const metroName = normalizeName(metro.name)
  const matchingKnownCities = cityData
    .filter((city) => metro.stateCodes.includes(city.stateCode) && metroName.includes(normalizeName(city.name)))
    .map((city) => normalizeName(city.name))

  return loggedCities.some((city) => (
    city === metroName
    || metroName.includes(city)
    || matchingKnownCities.includes(city)
  ))
}

function isParkLogged(park, stateByCode) {
  const loggedParks = getLoggedItemsForStates(stateByCode, park.stateCodes, 'parksVisited').map(normalizeName)
  if (!loggedParks.length) return false

  const parkName = normalizeName(park.name)
  return loggedParks.some((name) => name === parkName || parkName.includes(name) || name.includes(parkName))
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
  const [hoveredMapItem, setHoveredMapItem] = useState(null)

  const stateByCode = useMemo(() => new Map(states.map((state) => [state.code, state])), [states])
  const insetStates = useMemo(() => states.filter((state) => ['AK', 'HI'].includes(state.code)), [states])

  const statesGeoJson = useMemo(() => {
    return {
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
              hasSelection: Boolean(selectedStateCode),
            },
            geometry: item.geometry,
          }
        })
        .filter(Boolean),
    }
  }, [selectedStateCode, stateByCode])

  const metrosGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: metros.map((metro) => ({
      type: 'Feature',
      id: metro.id,
      properties: {
        id: metro.id,
        name: metro.name,
        stateCodes: metro.stateCodes.join(', '),
        active: isMetroLogged(metro, stateByCode),
        status: metro.status,
        selected: selectedMapItem?.type === 'metro' && selectedMapItem.id === metro.id,
        focused: metro.stateCodes.includes(selectedStateCode) || selectedMapItem?.id === metro.id,
      },
      geometry: metro.geometry,
    })),
  }), [metros, selectedMapItem, selectedStateCode, stateByCode])

  const parksGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: parks.map((park) => ({
      type: 'Feature',
      id: park.id,
      properties: {
        id: park.id,
        name: park.name,
        stateCodes: park.stateCodes.join(', '),
        visited: isParkLogged(park, stateByCode),
        selected: selectedMapItem?.type === 'park' && selectedMapItem.id === park.id,
        focused: park.stateCodes.includes(selectedStateCode) || selectedMapItem?.id === park.id,
      },
      geometry: park.geometry,
    })),
  }), [parks, selectedMapItem, selectedStateCode, stateByCode])

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
          'line-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#b43d2d',
            ['boolean', ['get', 'active'], false],
            '#1f83a6',
            '#1f5f78',
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3,
            ['case', ['boolean', ['get', 'active'], false], 0.42, 0.18],
            5,
            ['case', ['boolean', ['get', 'active'], false], 0.78, 0.42],
            7,
            0.9,
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'selected'], false],
            3.2,
            ['boolean', ['get', 'active'], false],
            2.3,
            1.4,
          ],
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
          'line-color': [
            'case',
            ['boolean', ['get', 'selected'], false],
            '#f2bf45',
            ['boolean', ['get', 'visited'], false],
            '#2f7a57',
            '#5d7f50',
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3,
            ['case', ['boolean', ['get', 'visited'], false], 0.46, 0.18],
            5,
            ['case', ['boolean', ['get', 'visited'], false], 0.8, 0.44],
            7,
            0.92,
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'selected'], false],
            3.2,
            ['boolean', ['get', 'visited'], false],
            2.3,
            1.4,
          ],
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
        const visited = event.features?.[0]?.properties?.visited
        if (park) latestMapDataRef.current.onSelectPark({
          ...park,
          visited: visited === true || visited === 'true',
        })
      })

      map.on('mouseenter', 'metros-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (id) setHoveredMapItem({ id, type: 'metro' })
      })
      map.on('mouseleave', 'metros-fill', () => setHoveredMapItem(null))
      map.on('mouseenter', 'parks-fill', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (id) setHoveredMapItem({ id, type: 'park' })
      })
      map.on('mouseleave', 'parks-fill', () => setHoveredMapItem(null))

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
      return { element, item, type }
    }

    const labels = [
      ...metros.map((item) => makeLabel(item, 'metro')),
      ...parks.map((item) => makeLabel(item, 'park')),
    ]

    const syncLabels = () => {
      const zoom = map.getZoom()
      labels.forEach(({ element, item, type }) => {
        const isSelected = selectedMapItem?.id === item.id
        const isHovered = hoveredMapItem?.id === item.id && hoveredMapItem?.type === type
        const layerVisible = type === 'metro' ? showCities : showParks
        const labelsAllowedByZoom = zoom >= (type === 'metro' ? 6.1 : 6.4)
        element.hidden = !layerVisible || !(isSelected || isHovered || labelsAllowedByZoom)
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
  }, [hoveredMapItem, isMapReady, metros, parks, selectedMapItem, showCities, showParks])

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
        <p>Pinch or scroll to explore.</p>
      </div>

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
