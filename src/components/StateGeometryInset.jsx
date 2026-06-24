import { useMemo } from 'react'

// Builds a normalized SVG path + viewBox from a GeoJSON Polygon/MultiPolygon
// geometry, fit to its own bounding box (preserving aspect ratio, no stretch).
function buildInsetPath(geometry, padding) {
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([x, y]) => {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      })
    })
  })

  const width = (maxX - minX) || 1
  const height = (maxY - minY) || 1
  const viewWidth = width + padding * 2
  const viewHeight = height + padding * 2

  const d = polygons
    .map((polygon) => polygon
      .map((ring) => {
        const points = ring.map(([x, y]) => (
          `${(x - minX + padding).toFixed(2)},${(y - minY + padding).toFixed(2)}`
        ))
        return `M${points.join('L')}Z`
      })
      .join(' '))
    .join(' ')

  return { d, viewHeight, viewWidth }
}

export function StateGeometryInset({
  code,
  geometry,
  name,
  onSelect,
  selected,
  statusColor,
}) {
  const { d, viewHeight, viewWidth } = useMemo(
    () => buildInsetPath(geometry, 4),
    [geometry],
  )

  return (
    <button
      aria-label={`Select ${name}`}
      className={['state-inset', selected ? 'is-selected' : ''].filter(Boolean).join(' ')}
      style={{ '--state-color': statusColor }}
      type="button"
      onClick={onSelect}
    >
      <svg
        aria-hidden="true"
        className="state-inset-shape"
        style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
        viewBox={`0 0 ${viewWidth.toFixed(2)} ${viewHeight.toFixed(2)}`}
      >
        <path d={d} />
      </svg>
      <span className="state-inset-label">
        <span className="state-inset-label__code">{code}</span>
        <span className="state-inset-label__name">{name}</span>
      </span>
    </button>
  )
}
