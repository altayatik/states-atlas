import { STATUS_COLORS, STATUS_LABELS } from '../data/states'

export function StatusLegend() {
  return (
    <div className="legend" aria-label="State visit status legend">
      {Object.entries(STATUS_LABELS).map(([status, label]) => (
        <span className="legend__item" key={status}>
          <span className="legend__swatch" style={{ backgroundColor: STATUS_COLORS[status] }} />
          {label}
        </span>
      ))}
    </div>
  )
}
