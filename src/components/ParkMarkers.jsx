export function ParkMarkers({ parks, selectedStateCode, projectPoint, onSelectPark }) {
  return (
    <g className="park-markers" aria-label="National park markers">
      {parks.map((park) => {
        const point = projectPoint(park)
        if (!point) return null

        const isActive = park.states.includes(selectedStateCode)

        return (
          <g
            className={isActive ? 'pin pin--park pin--active' : 'pin pin--park'}
            key={park.id}
            onClick={(event) => {
              event.stopPropagation()
              onSelectPark(park)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onSelectPark(park)
              }
            }}
            role="button"
            tabIndex="0"
            transform={`translate(${point[0]} ${point[1]})`}
          >
            <title>{`${park.name} National Park`}</title>
            <path d="M0 -8 L7 5 L-7 5 Z" />
            {isActive && (
              <text x="10" y="4">
                {park.name}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
