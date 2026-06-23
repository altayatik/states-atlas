import { useEffect, useId, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { BADGE_LABELS, STATUSES, STATUS_LABELS } from '../data/states'

function uniqueList(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

export function StateEditModal({
  cityOptions = [],
  isOpen,
  parkOptions = [],
  state,
  states,
  saveError,
  onCancel,
  onSave,
  onStateChange,
}) {
  const titleId = useId()
  const [draft, setDraft] = useState(state)
  const [customCity, setCustomCity] = useState('')
  const [customPark, setCustomPark] = useState('')

  useEffect(() => {
    setDraft(state)
  }, [state])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onCancel])

  const stateCityOptions = useMemo(
    () => cityOptions.filter((city) => city.stateCode === draft?.code),
    [cityOptions, draft?.code],
  )
  const stateParkOptions = useMemo(
    () => parkOptions.filter((park) => park.states.includes(draft?.code)),
    [draft?.code, parkOptions],
  )

  if (!isOpen || !draft) return null

  const updateField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const toggleBadge = (badge) => {
    setDraft((current) => {
      const badges = current.badges.includes(badge)
        ? current.badges.filter((item) => item !== badge)
        : [...current.badges, badge]
      return { ...current, badges }
    })
  }

  const toggleListItem = (field, value) => {
    setDraft((current) => {
      const currentList = current[field] ?? []
      const nextList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : uniqueList([...currentList, value])
      return { ...current, [field]: nextList }
    })
  }

  const removeListItem = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: (current[field] ?? []).filter((item) => item !== value),
    }))
  }

  const addCustomItem = (field, value, reset) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setDraft((current) => ({
      ...current,
      [field]: uniqueList([...(current[field] ?? []), trimmed]),
    }))
    reset('')
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-labelledby={titleId} aria-modal="true" className="modal" role="dialog">
        <div className="modal__header">
          <div>
            <p className="eyebrow">Atlas edit</p>
            <h2 id={titleId}>Update state memory</h2>
          </div>
          <button aria-label="Close edit modal" className="icon-button" type="button" onClick={onCancel}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          className="edit-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              ...draft,
              firstVisitedYear: draft.firstVisitedYear ? Number(draft.firstVisitedYear) : '',
              updatedAt: new Date().toISOString(),
            })
          }}
        >
          <label>
            State
            <select
              value={draft.code}
              onChange={(event) => {
                const nextState = states.find((item) => item.code === event.target.value)
                onStateChange(nextState.code)
                setDraft(nextState)
              }}
            >
              {states.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

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
              <span className="range-value">{draft.vibeRating}/5</span>
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
                  <label key={city.id}>
                    <input
                      checked={draft.citiesVisited.includes(city.name)}
                      type="checkbox"
                      onChange={() => toggleListItem('citiesVisited', city.name)}
                    />
                    {city.name}
                  </label>
                ))}
              </div>
              <div className="custom-add-row">
                <input
                  placeholder="Add a custom city"
                  value={customCity}
                  onChange={(event) => setCustomCity(event.target.value)}
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
              <div className="multi-check-list">
                {stateParkOptions.map((park) => (
                  <label key={park.id}>
                    <input
                      checked={draft.parksVisited.includes(park.name)}
                      type="checkbox"
                      onChange={() => toggleListItem('parksVisited', park.name)}
                    />
                    {park.name}
                  </label>
                ))}
              </div>
              <div className="custom-add-row">
                <input
                  placeholder="Add a custom park"
                  value={customPark}
                  onChange={(event) => setCustomPark(event.target.value)}
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

          {saveError && <p className="form-error" role="alert">{saveError}</p>}

          <div className="modal__actions">
            <button className="button button--secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="button" type="submit">
              Save state
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
