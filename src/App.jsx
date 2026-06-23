import { useEffect, useMemo, useState } from 'react'
import { AtlasHeader } from './components/AtlasHeader'
import { StatsCards } from './components/StatsCards'
import { TravelMap } from './components/TravelMap'
import { StateDetailPanel } from './components/StateDetailPanel'
import { StateEditModal } from './components/StateEditModal'
import { Achievements } from './components/Achievements'
import { LatestMemories } from './components/LatestMemories'
import { AtlasEditor } from './components/AtlasEditor'
import { PasswordGate } from './components/PasswordGate'
import { states as defaultStates } from './data/states'
import { cities } from './data/cities'
import { parks } from './data/parks'
import { metroAreas } from './data/metroAreas'
import { parkBoundaries } from './data/parkBoundaries'
import { evaluateAchievements } from './utils/achievements'
import { getRegionalProgress, getStats } from './utils/stats'
import { mergeStoredStates } from './utils/storage'
import {
  clearAdminToken,
  fetchStateTravelEntries,
  getStoredAdminToken,
  isSupabaseConfigured,
  storeAdminToken,
  upsertStateTravelEntry,
  validateAdminSecret,
} from './services/stateTravelApi'
import './styles.css'

function getIsEditorRoute() {
  if (typeof window === 'undefined') return false
  return window.location.hash === '#/edit'
    || window.location.pathname.endsWith('/states/edit')
    || window.location.pathname.endsWith('/states/edit/')
    || window.location.pathname.endsWith('/states-edit')
    || window.location.pathname.endsWith('/states-edit/')
}

function App() {
  const [states, setStates] = useState(defaultStates)
  const [selectedStateCode, setSelectedStateCode] = useState('CA')
  const [selectedMapItem, setSelectedMapItem] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [isEditorRoute, setIsEditorRoute] = useState(getIsEditorRoute)
  const [isEditorUnlocked, setIsEditorUnlocked] = useState(() => Boolean(getStoredAdminToken()))
  const [gateError, setGateError] = useState('')

  useEffect(() => {
    const updateRoute = () => setIsEditorRoute(getIsEditorRoute())

    window.addEventListener('hashchange', updateRoute)
    window.addEventListener('popstate', updateRoute)
    return () => {
      window.removeEventListener('hashchange', updateRoute)
      window.removeEventListener('popstate', updateRoute)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadEntries() {
      try {
        const entries = await fetchStateTravelEntries()
        if (isMounted) setStates(mergeStoredStates(defaultStates, entries))
      } catch (error) {
        console.warn('Unable to load Supabase entries. Showing static atlas data.', error)
        if (isMounted) setStates(defaultStates)
      } finally {
        if (isMounted) setIsLoadingEntries(false)
      }
    }

    loadEntries()

    return () => {
      isMounted = false
    }
  }, [])

  const selectedState = states.find((state) => state.code === selectedStateCode)
  const stats = useMemo(() => getStats(states), [states])
  const regions = useMemo(() => getRegionalProgress(states), [states])
  const achievements = useMemo(() => evaluateAchievements(states), [states])

  const selectState = (code) => {
    setSelectedStateCode(code)
    setSelectedMapItem(null)
  }

  const openEdit = (code = selectedStateCode) => {
    setSaveError('')
    setSelectedStateCode(code)
    setIsEditOpen(true)
  }

  const goPublic = () => {
    window.location.href = '/states/'
  }

  const refreshEntries = async () => {
    const entries = await fetchStateTravelEntries()
    setStates(mergeStoredStates(defaultStates, entries))
  }

  const saveState = async (draft) => {
    setSaveError('')

    try {
      const result = await upsertStateTravelEntry(draft, {
        adminToken: getStoredAdminToken(),
      })

      if (result.adminToken) {
        storeAdminToken(result.adminToken)
      }

      if (isSupabaseConfigured) {
        await refreshEntries()
      } else {
        setStates((current) => current.map((state) => (state.code === draft.code ? draft : state)))
      }

      setSelectedStateCode(draft.code)
      setIsEditOpen(false)
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken()
        setIsEditorUnlocked(false)
        setIsEditOpen(false)
        setSaveError('That secret phrase doesn’t match. Try again.')
        setGateError('That secret phrase doesn’t match. Try again.')
        return
      }

      setSaveError(error.message || 'Unable to save this atlas entry.')
    }
  }

  const unlockEditor = async (secretPhrase) => {
    setGateError('')

    try {
      const result = await validateAdminSecret(secretPhrase)
      if (!result.ok) {
        setGateError('That secret phrase doesn’t match. Try again.')
        return
      }

      if (result.adminToken) {
        storeAdminToken(result.adminToken)
      }

      setIsEditorUnlocked(true)
    } catch (error) {
      clearAdminToken()
      setGateError(error.status === 401
        ? 'That secret phrase doesn’t match. Try again.'
        : 'Editor unlock is not configured yet. Check the Supabase function and secrets.')
    }
  }

  if (isEditorRoute && !isEditorUnlocked) {
    return (
      <div className="app-shell app-shell--editor">
        <PasswordGate error={gateError} onBack={goPublic} onSubmit={unlockEditor} />
      </div>
    )
  }

  if (isEditorRoute) {
    return (
      <div className="app-shell app-shell--editor">
        {isLoadingEntries && <div className="sync-banner">Loading atlas entries...</div>}
        <AtlasEditor states={states} onBack={goPublic} onEdit={openEdit} />
        <StateEditModal
          cityOptions={cities}
          isOpen={isEditOpen}
          onCancel={() => setIsEditOpen(false)}
          saveError={saveError}
          onSave={saveState}
          onStateChange={setSelectedStateCode}
          parkOptions={parks}
          state={selectedState}
          states={states}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AtlasHeader />
      {isLoadingEntries && <div className="sync-banner">Loading atlas entries...</div>}
      <StatsCards regions={regions} stats={stats} />

      <main>
        <div className="atlas-layout">
          <TravelMap
            metros={metroAreas}
            onSelectMetro={(metro) => {
              setSelectedMapItem({ ...metro, type: 'metro' })
              setSelectedStateCode(metro.stateCodes[0])
            }}
            onSelectPark={(park) => {
              setSelectedMapItem({ ...park, type: 'park' })
              setSelectedStateCode(park.stateCodes[0])
            }}
            onSelectState={selectState}
            parks={parkBoundaries}
            selectedMapItem={selectedMapItem}
            selectedStateCode={selectedStateCode}
            states={states}
          />
          <StateDetailPanel
            cities={cities}
            parks={parks}
            selectedMapItem={selectedMapItem}
            state={selectedState}
          />
        </div>

        <Achievements achievements={achievements} />
        <LatestMemories states={states} />
      </main>
    </div>
  )
}

export default App
