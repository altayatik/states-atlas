import { STATUS_LABELS } from '../data/states'

export function formatStatus(status) {
  return STATUS_LABELS[status] ?? status
}

export function formatPercent(value) {
  return `${Math.round(value)}%`
}

export function formatList(items) {
  if (!items?.length) return 'None yet'
  return items.join(', ')
}
