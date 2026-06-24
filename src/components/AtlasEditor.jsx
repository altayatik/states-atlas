import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { BADGE_LABELS, STATUSES, STATUS_LABELS } from '../data/states'
import { getCityOptionsForState, getParkOptionsForState } from '../data/stateTravelOptions'
import { formatStatus } from '../utils/formatters'
import { isPlaceOptionSelected } from '../utils/places'

function cloneState(state) {
  if (!state) return null
  return {
    ...state,
    badges: [...(state.badges ?? [])],
    citiesVisited: [...(state.citiesVisited ?? [])],
    parksVisited: [...(state.parksVisited ?? [])],
  }
}

function uniqueList(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

function normalizeDraft(draft) {
  return {
    ...draft,
    badges: uniqueList(draft.badges ?? []),
    citiesVisited: uniqueList(draft.citiesVisited ?? []),
    favoriteMemory: draft.favoriteMemory ?? '',
    firstVisitedYear: draft.firstVisitedYear ? Number(draft.firstVisitedYear) : '',
    honorableMention: Boolean(draft.honorableMention),
    parksVisited: uniqueList(draft.parksVisited ?? []),
    vibeRating: Number(draft.vibeRating) || 0,
  }
}

function serializeDraft(draft) {
  if (!draft) return ''
  const normalized = normalizeDraft(draft)
  return JSON.stringify({
    badges: normalized.badges,
    citiesVisited: normalized.citiesVisited,
    code: normalized.code,
    favoriteMemory: normalized.favoriteMemory,
    firstVisitedYear: normalized.firstVisitedYear,
    honorableMention: normalized.honorableMention,
    parksVisited: normalized.parksVisited,
    status: normalized.status,
    vibeRating: normalized.vibeRating,
  })
}

function validateDraft(draft) {
  const normalized = normalizeDraft(draft)
  const currentYear = normalized.firstVisitedYear

  if (!STATUSES.includes(normalized.status)) return 'Choose a valid status.'
  if (currentYear && (currentYear < 1900 || currentYear > 2100)) return 'First visited year must be between 1900 and 2100.'
  if (normalized.vibeRating && (normalized.vibeRating < 1 || normalized.vibeRating > 5)) return 'Vibe rating must be 1 through 5.'
  if (normalized.favoriteMemory.length > 1000) return 'Favorite memory must be 1000 characters or fewer.'
  if (!normalized.citiesVisited.every((city) => typeof city === 'string' && city.length <= 100)) return 'Each city must be 100 characters or fewer.'
  if (!normalized.parksVisited.every((park) => typeof park === 'string' && park.length <= 120)) return 'Each park must be 120 characters or fewer.'

  return ''
}

export function AtlasEditor({ states, onBack, onSave }) {
  const [selectedCode, setSelectedCode] = useState('')
  const [draft, setDraft] = useState(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [formError, setFormError] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [customPark, setCustomPark] = useState('')

  const selectedState = states.find((state) => state.code === selectedCode)
  const isDirty = Boolean(draft && serializeDraft(draft) !== savedSnapshot)

  const stateCityOptions = useMemo(
    () => getCityOptionsForState(draft?.code),
    [draft?.code],
  )

  const stateParkOptions = useMemo(
    () => getParkOptionsForState(draft?.code),
    [draft?.code],
  )

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const startEditing = (code) => {
    const nextState = states.find((state) => state.code === code)
    const nextDraft = cloneState(nextState)
    setSelectedCode(code)
    setDraft(nextDraft)
    setSavedSnapshot(serializeDraft(nextDraft))
    setSaveStatus(nextDraft ? 'saved' : 'idle')
    setFormError('')
    setCustomCity('')
    setCustomPark('')
  }

  const saveDraftIfNeeded = async () => {
    if (!draft || !isDirty) return true

    const validationError = validateDraft(draft)
    if (validationError) {
      setFormError(validationError)
      setSaveStatus('error')
      return false
    }

    const nextDraft = {
      ...normalizeDraft(draft),
      updatedAt: new Date().toISOString(),
    }

    setFormError('')
    setSaveStatus('saving')

    try {
      await onSave(nextDraft)
      setDraft(nextDraft)
      setSavedSnapshot(serializeDraft(nextDraft))
      setSaveStatus('saved')
      return true
    } catch (error) {
      setFormError(error.message || 'Couldn’t save changes')
      setSaveStatus('error')
      return false
    }
  }

  const handleStateChange = async (event) => {
    const nextCode = event.target.value
    if (nextCode === selectedCode) return

    const canSwitch = await saveDraftIfNeeded()
    if (!canSwitch) return

    if (!nextCode) {
      setSelectedCode('')
      setDraft(null)
      setSavedSnapshot('')
      setSaveStatus('idle')
      return
    }

    startEditing(nextCode)
  }

  const handleClose = async () => {
    const canClose = await saveDraftIfNeeded()
    if (!canClose) return
    setSelectedCode('')
    setDraft(null)
    setSavedSnapshot('')
    setSaveStatus('idle')
  }

  const handleBack = async () => {
    const canLeave = await saveDraftIfNeeded()
    if (canLeave) onBack()
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaveStatus('idle')
  }

  const toggleBadge = (badge) => {
    setDraft((current) => {
      const badges = current.badges.includes(badge)
        ? current.badges.filter((item) => item !== badge)
        : [...current.badges, badge]
      return { ...current, badges }
    })
    setSaveStatus('idle')
  }

  const toggleListItem = (field, value) => {
    setDraft((current) => {
      const currentList = current[field] ?? []
      const isSelected = isPlaceOptionSelected(currentList, value)
      const nextList = isSelected
        ? currentList.filter((item) => !isPlaceOptionSelected([item], value))
        : uniqueList([...currentList, value])
      return { ...current, [field]: nextList }
    })
    setSaveStatus('idle')
  }

  const removeListItem = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: (current[field] ?? []).filter((item) => item !== value),
    }))
    setSaveStatus('idle')
  }

  const addCustomItem = (field, value, reset) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setDraft((current) => ({
      ...current,
      [field]: uniqueList([...(current[field] ?? []), trimmed]),
    }))
    reset('')
    setSaveStatus('idle')
  }

  const statusText = (() => {
    if (saveStatus === 'saving') return 'Saving...'
    if (saveStatus === 'error') return 'Couldn’t save changes'
    if (isDirty) return 'Unsaved changes'
    if (saveStatus === 'saved' && draft) return 'Saved'
    return ''
  })()

  const statusIcon = saveStatus === 'saving'
    ? <Loader2 className="spin-icon" size={16} aria-hidden="true" />
    : saveStatus === 'error' || isDirty
      ? <AlertTriangle size={16} aria-hidden="true" />
      : <CheckCircle2 size={16} aria-hidden="true" />

  return (
    <main className="editor-page">
      <header className="editor-header">
        <div>
          <p className="eyebrow">Private dashboard</p>
          <h1>Road Atlas Editor</h1>
          <p>Update state memories, statuses, badges, city lists, and park lists.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={handleBack}>
          Back to public atlas
        </button>
      </header>

      <section className="editor-tools editor-tools--single" aria-label="State picker">
        <label>
          Choose a state to edit
          <select value={selectedCode} onChange={handleStateChange}>
            <option value="">Choose a state</option>
            {states.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name} — {formatStatus(state.status)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="editor-select-panel" aria-label="Selected state editor">
        {!draft ? (
          <div className="editor-empty-state">
            <h2>Choose a state to start editing.</h2>
          </div>
        ) : (
          <article className="editor-form-panel">
            <div className="editor-form-panel__header">
              <div>
                <p className="eyebrow">{selectedState?.code}</p>
                <h2>{selectedState?.name}</h2>
                <p>{formatStatus(draft.status)}</p>
              </div>
              <div className="editor-form-panel__actions">
                {statusText && (
                  <span className={`save-status save-status--${saveStatus || 'idle'}`} aria-live="polite">
                    {statusIcon}
                    {statusText}
                  </span>
                )}
                <button aria-label="Close editor and save changes" className="icon-button" type="button" onClick={handleClose}>
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            <form className="edit-form" onSubmit={(event) => event.preventDefault()}>
              <div className="form-grid">
                <label>
                  Status
                  <select value={draft.status} onChange={(event) => updateField('status', event.target.value)}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  First visited year
                  <input
                    inputMode="numeric"
                    max="2100"
                    min="1900"
                    placeholder="2024"
                    type="number"
                    value={draft.firstVisitedYear}
                    onChange={(event) => updateField('firstVisitedYear', event.target.value)}
                  />
                </label>
                <label>
                  Vibe rating
                  <input
                    max="5"
                    min="0"
                    type="range"
                    value={draft.vibeRating}
                    onChange={(event) => updateField('vibeRating', Number(event.target.value))}
                  />
                  <span className="range-value">{draft.vibeRating ? `${draft.vibeRating}/5` : 'Not rated'}</span>
                </label>
              </div>

              <label>
                Favorite memory
                <textarea
                  rows="4"
                  value={draft.favoriteMemory}
                  onChange={(event) => updateField('favoriteMemory', event.target.value)}
                />
              </label>

              <fieldset>
                <legend>Badges</legend>
                <div className="checkbox-grid">
                  {Object.entries(BADGE_LABELS).map(([badge, label]) => (
                    <label key={badge}>
                      <input
                        checked={draft.badges.includes(badge)}
                        type="checkbox"
                        onChange={() => toggleBadge(badge)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="checkbox-line">
                <input
                  checked={draft.honorableMention}
                  type="checkbox"
                  onChange={(event) => updateField('honorableMention', event.target.checked)}
                />
                Honorable mention
              </label>

              <div className="form-grid form-grid--wide">
                <fieldset className="multi-select-field">
                  <legend>Cities visited</legend>
                  <div className="chip-row" aria-label="Selected cities">
                    {draft.citiesVisited.length ? (
                      draft.citiesVisited.map((city) => (
                        <span className="edit-chip" key={city}>
                          {city}
                          <button type="button" onClick={() => removeListItem('citiesVisited', city)}>
                            Remove
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="empty-chip">No cities selected</span>
                    )}
                  </div>
                  <div className="multi-check-list">
                    {stateCityOptions.map((city) => (
                      <label key={city}>
                        <input
                          checked={isPlaceOptionSelected(draft.citiesVisited, city)}
                          type="checkbox"
                          onChange={() => toggleListItem('citiesVisited', city)}
                        />
                        {city}
                      </label>
                    ))}
                  </div>
                  <div className="custom-add-row">
                    <input
                      placeholder="Add a custom city"
                      value={customCity}
                      onChange={(event) => setCustomCity(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addCustomItem('citiesVisited', customCity, setCustomCity)
                        }
                      }}
                    />
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => addCustomItem('citiesVisited', customCity, setCustomCity)}
                    >
                      Add
                    </button>
                  </div>
                </fieldset>

                <fieldset className="multi-select-field">
                  <legend>National parks visited</legend>
                  <div className="chip-row" aria-label="Selected parks">
                    {draft.parksVisited.length ? (
                      draft.parksVisited.map((park) => (
                        <span className="edit-chip" key={park}>
                          {park}
                          <button type="button" onClick={() => removeListItem('parksVisited', park)}>
                            Remove
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="empty-chip">No parks selected</span>
                    )}
                  </div>
                  {stateParkOptions.length > 0 ? (
                    <div className="multi-check-list">
                      {stateParkOptions.map((park) => (
                        <label key={park}>
                          <input
                            checked={isPlaceOptionSelected(draft.parksVisited, park)}
                            type="checkbox"
                            onChange={() => toggleListItem('parksVisited', park)}
                          />
                          {park}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-option-note">No national parks in this state :(</p>
                  )}
                  <div className="custom-add-row">
                    <input
                      placeholder="Add a custom park"
                      value={customPark}
                      onChange={(event) => setCustomPark(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addCustomItem('parksVisited', customPark, setCustomPark)
                        }
                      }}
                    />
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => addCustomItem('parksVisited', customPark, setCustomPark)}
                    >
                      Add
                    </button>
                  </div>
                </fieldset>
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}
            </form>
          </article>
        )}
      </section>
    </main>
  )
}
