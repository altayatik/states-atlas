import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Save, Search, Trash2, X } from 'lucide-react'
import {
  CUSTOM_PARK_VALUE,
  getOfficialParkByName,
  getOfficialParkDisplayName,
  getOfficialParksByCountry,
  officialParks,
} from '../data/nationalParks'
import { calculateTotal, defaultParkScores, normalizeScores, scoreCategories } from '../utils/parkScoring'

function cloneRanking(ranking) {
  if (!ranking) return null

  return {
    ...ranking,
    scores: normalizeScores(ranking.scores),
  }
}

function createNewRanking() {
  const firstPark = officialParks[0]

  return {
    honorableMention: false,
    id: '',
    isCustom: false,
    notes: '',
    parkCode: firstPark.parkCode,
    parkName: firstPark.name,
    scores: normalizeScores(defaultParkScores),
    state: firstPark.state,
    visitedDate: '',
  }
}

function serializeDraft(draft) {
  if (!draft) return ''

  const scores = normalizeScores(draft.scores)

  return JSON.stringify({
    honorableMention: Boolean(draft.honorableMention),
    id: draft.id || '',
    isCustom: Boolean(draft.isCustom),
    notes: draft.notes || '',
    parkCode: draft.parkCode || '',
    parkName: draft.parkName || '',
    scores,
    visitedDate: draft.visitedDate || '',
  })
}

function validateDraft(draft) {
  if (!draft.parkName?.trim()) return 'Choose a park or enter a custom park name.'
  if (draft.notes?.length > 1000) return 'Notes must be 1000 characters or fewer.'

  return ''
}

function getSelectedParkValue(draft) {
  if (!draft) return ''
  return draft.isCustom || !getOfficialParkByName(draft.parkName) ? CUSTOM_PARK_VALUE : getOfficialParkByName(draft.parkName).name
}

export function NationalParksEditor({ isLoading, onDelete, onSave, rankings }) {
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [customParkName, setCustomParkName] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [formError, setFormError] = useState('')
  const [rankingFilter, setRankingFilter] = useState('')

  const selectedRanking = useMemo(
    () => rankings.find((ranking) => ranking.id === selectedId),
    [rankings, selectedId],
  )
  const isDirty = Boolean(draft && serializeDraft(draft) !== savedSnapshot)
  const isSaving = saveStatus === 'saving'
  const selectedParkValue = getSelectedParkValue(draft)
  const draftDisplayName = draft?.isCustom ? draft.parkName : getOfficialParkDisplayName(draft?.parkName)
  const usParkOptions = useMemo(() => getOfficialParksByCountry('us'), [])
  const canadaParkOptions = useMemo(() => getOfficialParksByCountry('canada'), [])
  const filteredRankings = useMemo(() => {
    const normalizedFilter = rankingFilter.trim().toLowerCase()
    if (!normalizedFilter) return rankings

    return rankings.filter((ranking) => {
      const displayName = ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)
      return ranking.id === selectedId
        || displayName.toLowerCase().includes(normalizedFilter)
        || ranking.parkCode?.toLowerCase().includes(normalizedFilter)
        || ranking.state?.toLowerCase().includes(normalizedFilter)
    })
  }, [rankingFilter, rankings, selectedId])

  useEffect(() => {
    if (!selectedId || selectedId === 'new') return
    if (!selectedRanking) return

    const nextDraft = cloneRanking(selectedRanking)
    setDraft(nextDraft)
    setCustomParkName(nextDraft.isCustom ? nextDraft.parkName : '')
    setSavedSnapshot(serializeDraft(nextDraft))
    setSaveStatus('saved')
  }, [selectedId, selectedRanking])

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const startNewRanking = () => {
    const nextDraft = createNewRanking()
    setSelectedId('new')
    setDraft(nextDraft)
    setCustomParkName('')
    setSavedSnapshot(serializeDraft(nextDraft))
    setSaveStatus('idle')
    setFormError('')
  }

  const saveDraftIfNeeded = async () => {
    if (!draft || !isDirty) return true

    const validationError = validateDraft(draft)
    if (validationError) {
      setFormError(validationError)
      setSaveStatus('error')
      return false
    }

    setFormError('')
    setSaveStatus('saving')

    try {
      const savedRanking = await onSave({
        ...draft,
        notes: draft.notes?.trim() || '',
        parkName: draft.parkName.trim(),
        scores: normalizeScores(draft.scores),
      })
      const nextDraft = cloneRanking(savedRanking)
      setSelectedId(savedRanking.id)
      setDraft(nextDraft)
      setSavedSnapshot(serializeDraft(nextDraft))
      setCustomParkName(savedRanking.isCustom ? savedRanking.parkName : '')
      setSaveStatus('saved')
      return true
    } catch (error) {
      setFormError(error.message || 'Couldn’t save changes')
      setSaveStatus('error')
      return false
    }
  }

  const handleRankingChange = async (event) => {
    const nextId = event.target.value
    if (nextId === selectedId) return

    const canSwitch = await saveDraftIfNeeded()
    if (!canSwitch) return

    setFormError('')

    if (!nextId) {
      setSelectedId('')
      setDraft(null)
      setSavedSnapshot('')
      setSaveStatus('idle')
      return
    }

    if (nextId === 'new') {
      startNewRanking()
      return
    }

    setSelectedId(nextId)
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setSaveStatus('idle')
  }

  const updateScore = (field, value) => {
    setDraft((current) => ({
      ...current,
      scores: normalizeScores({ ...current.scores, [field]: value }),
    }))
    setSaveStatus('idle')
  }

  const updatePark = (value) => {
    if (value === CUSTOM_PARK_VALUE) {
      setDraft((current) => ({
        ...current,
        isCustom: true,
        parkCode: '',
        parkName: customParkName,
        state: 'Custom',
      }))
      setSaveStatus('idle')
      return
    }

    const park = getOfficialParkByName(value)
    setDraft((current) => ({
      ...current,
      isCustom: false,
      parkCode: park?.parkCode || '',
      parkName: park?.name || '',
      state: park?.state || '',
    }))
    setCustomParkName('')
    setSaveStatus('idle')
  }

  const updateCustomParkName = (value) => {
    setCustomParkName(value)
    setDraft((current) => ({
      ...current,
      isCustom: true,
      parkCode: '',
      parkName: value,
      state: 'Custom',
    }))
    setSaveStatus('idle')
  }

  const handleClose = async () => {
    const canClose = await saveDraftIfNeeded()
    if (!canClose) return
    setSelectedId('')
    setDraft(null)
    setSavedSnapshot('')
    setCustomParkName('')
    setSaveStatus('idle')
  }

  const handleDelete = async () => {
    if (!draft?.id) return
    const confirmed = window.confirm(`Delete the ranking for ${draftDisplayName || draft.parkName}? This cannot be undone.`)
    if (!confirmed) return

    setFormError('')
    setSaveStatus('saving')

    try {
      await onDelete(draft.id)
      setSelectedId('')
      setDraft(null)
      setSavedSnapshot('')
      setCustomParkName('')
      setSaveStatus('idle')
    } catch (error) {
      setFormError(error.message || 'Couldn’t delete ranking')
      setSaveStatus('error')
    }
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
    <>
      <section className="editor-tools editor-tools--picker glass-panel" aria-label="National park picker">
        <label className="search-field">
          <span>Search rankings</span>
          <Search size={17} aria-hidden="true" />
          <input
            placeholder="Type a park, code, or state"
            value={rankingFilter}
            onChange={(event) => setRankingFilter(event.target.value)}
          />
        </label>
        <label>
          Choose a park ranking to edit
          <select value={selectedId} onChange={handleRankingChange}>
            <option value="">Choose a ranking</option>
            <option value="new">Add a new park ranking</option>
            {filteredRankings.map((ranking) => (
              <option key={ranking.id} value={ranking.id}>
                {ranking.isCustom ? ranking.parkName : getOfficialParkDisplayName(ranking.parkName)} {ranking.parkCode ? `(${ranking.parkCode})` : ''}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="editor-select-panel" aria-label="Selected national park editor">
        {!draft ? (
          <div className="editor-empty-state glass-panel">
            <h2>{isLoading ? 'Loading park rankings...' : 'Choose a park ranking to start editing.'}</h2>
            <p>Park scores, notes, visited dates, and honorable mentions save to Firestore.</p>
          </div>
        ) : (
          <article className="editor-form-panel editor-panel glass-panel">
            <div className="editor-form-panel__header">
              <div>
                <p className="eyebrow">{draft.parkCode || (draft.isCustom ? 'Custom park' : 'National Park')}</p>
                <h2>{draftDisplayName || 'New park ranking'}</h2>
                <p>{draft.state} · {calculateTotal(draft.scores)}/50 total score</p>
              </div>
              <div className="editor-form-panel__actions">
                {statusText && (
                  <span className={`save-status save-status--${saveStatus || 'idle'}`} aria-live="polite">
                    {statusIcon}
                    {statusText}
                  </span>
                )}
                <button
                  className="button"
                  disabled={!isDirty || isSaving}
                  type="button"
                  onClick={saveDraftIfNeeded}
                >
                  {isSaving ? <Loader2 className="spin-icon" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                  Save
                </button>
                {draft.id && (
                  <button aria-label="Delete park ranking" className="icon-button icon-button--danger" type="button" onClick={handleDelete}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
                <button aria-label="Close editor and save changes" className="icon-button" type="button" onClick={handleClose}>
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            <form className="edit-form" onSubmit={(event) => event.preventDefault()}>
              <div className="form-grid">
                <label>
                  Park
                  <select value={selectedParkValue} onChange={(event) => updatePark(event.target.value)}>
                    <optgroup label="U.S. National Parks">
                      {usParkOptions.map((park) => (
                        <option key={park.parkCode} value={park.name}>
                          {getOfficialParkDisplayName(park.name)} ({park.state})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Canada National Parks">
                      {canadaParkOptions.map((park) => (
                        <option key={park.parkCode} value={park.name}>
                          {getOfficialParkDisplayName(park.name)}
                        </option>
                      ))}
                    </optgroup>
                    <option value={CUSTOM_PARK_VALUE}>Custom park</option>
                  </select>
                </label>
                {selectedParkValue === CUSTOM_PARK_VALUE && (
                  <label>
                    Custom park name
                    <input
                      placeholder="Favorite overlook, state park, or future NPS unit"
                      value={customParkName}
                      onChange={(event) => updateCustomParkName(event.target.value)}
                    />
                  </label>
                )}
                <label>
                  Visited date
                  <input
                    type="date"
                    value={draft.visitedDate}
                    onChange={(event) => updateField('visitedDate', event.target.value)}
                  />
                </label>
              </div>

              <fieldset>
                <legend>Scores</legend>
                <div className="park-score-editor-grid">
                  {scoreCategories.map((category) => (
                    <label key={category.key}>
                      {category.label}
                      <input
                        max="10"
                        min="1"
                        type="range"
                        value={draft.scores[category.key]}
                        onChange={(event) => updateScore(category.key, event.target.value)}
                      />
                      <span className="range-value">{draft.scores[category.key]}/10</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                Notes
                <textarea
                  rows="4"
                  value={draft.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                />
              </label>

              <label className="checkbox-line">
                <input
                  checked={draft.honorableMention}
                  type="checkbox"
                  onChange={(event) => updateField('honorableMention', event.target.checked)}
                />
                Honorable mention
              </label>

              {formError && <p className="form-error" role="alert">{formError}</p>}
            </form>
          </article>
        )}
      </section>
    </>
  )
}
