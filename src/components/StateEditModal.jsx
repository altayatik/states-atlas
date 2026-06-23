import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { BADGE_LABELS, STATUSES, STATUS_LABELS } from '../data/states'

export function StateEditModal({
  isOpen,
  state,
  states,
  saveError,
  onCancel,
  onSave,
  onStateChange,
}) {
  const titleId = useId()
  const [draft, setDraft] = useState(state)

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

  const parseList = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

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

          <div className="form-grid">
            <label>
              Cities visited
              <input
                value={draft.citiesVisited.join(', ')}
                onChange={(event) => updateField('citiesVisited', parseList(event.target.value))}
              />
            </label>
            <label>
              Parks visited
              <input
                value={draft.parksVisited.join(', ')}
                onChange={(event) => updateField('parksVisited', parseList(event.target.value))}
              />
            </label>
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
