export function CityPins({ cities, selectedStateCode, projectPoint, onSelectCity }) {
  return (
    <g className="city-pins" aria-label="Visited city pins">
      {cities.map((city) => {
        const point = projectPoint(city)
        if (!point) return null

        const isActive = selectedStateCode === city.stateCode

        return (
          <g
            className={isActive ? 'pin pin--city pin--active' : 'pin pin--city'}
            key={city.id}
            onClick={(event) => {
              event.stopPropagation()
              onSelectCity(city)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onSelectCity(city)
              }
            }}
            role="button"
            tabIndex="0"
            transform={`translate(${point[0]} ${point[1]})`}
          >
            <title>{`${city.name}, ${city.stateCode}`}</title>
            <circle r={isActive ? 7 : 5} />
            {(isActive || selectedStateCode === city.stateCode) && (
              <text x="10" y="4">
                {city.name}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
