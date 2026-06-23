const STORAGE_KEY = 'states-atlas.travel-data.v2'

export function loadStoredStates() {
  if (typeof window === 'undefined') return null

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.warn('Unable to load atlas data from localStorage.', error)
    return null
  }
}

export function saveStoredStates(states) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
  } catch (error) {
    console.warn('Unable to save atlas data to localStorage.', error)
  }
}

export function mergeStoredStates(defaultStates, storedStates) {
  if (!Array.isArray(storedStates)) return defaultStates

  const storedByCode = new Map(storedStates.map((state) => [state.code, state]))

  return defaultStates.map((state) => ({
    ...state,
    ...storedByCode.get(state.code),
  }))
}

export function clearStoredStates() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
