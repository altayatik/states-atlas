import { useEffect, useMemo, useState } from 'react'
import { AtlasHeader } from './components/AtlasHeader'
import { StatsCards } from './components/StatsCards'
import { TravelMap } from './components/TravelMap'
import { StateDetailPanel } from './components/StateDetailPanel'
import { Achievements } from './components/Achievements'
import { AtlasEditor } from './components/AtlasEditor'
import { PasswordGate } from './components/PasswordGate'
import { states as defaultStates } from './data/states'
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
  validateEditorAccess,
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
  const [selectedStateCode, setSelectedStateCode] = useState('')
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [isEditorRoute, setIsEditorRoute] = useState(getIsEditorRoute)
  const [isEditorUnlocked, setIsEditorUnlocked] = useState(false)
  const [isCheckingEditorToken, setIsCheckingEditorToken] = useState(false)
  const [gateError, setGateError] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)

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
    setSelectedPlace(null)
    setSelectedStateCode(code)
  }

  const selectMetro = (metro) => {
    setSelectedPlace({ item: metro, type: 'metro' })
    setSelectedStateCode(metro.stateCodes?.[0] ?? selectedStateCode)
  }

  const selectPark = (park) => {
    setSelectedPlace({ item: park, type: 'park' })
    setSelectedStateCode(park.stateCodes?.[0] ?? selectedStateCode)
  }

  const goPublic = () => {
    window.location.href = '/states/'
  }

  const refreshEntries = async () => {
    const entries = await fetchStateTravelEntries()
    setStates(mergeStoredStates(defaultStates, entries))
  }

  const persistState = async (draft) => {
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
      return draft
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken()
        setIsEditorUnlocked(false)
        setGateError('That secret phrase doesn’t match. Try again.')
      }

      throw error
    }
  }

  const unlockEditor = async (secretPhrase) => {
    setGateError('')

    try {
      const result = await validateEditorAccess({ secretPhrase })
      if (!result.ok || !result.adminToken) {
        setGateError(result.message || 'That secret phrase doesn’t match. Try again.')
        return
      }

      storeAdminToken(result.adminToken)

      setIsEditorUnlocked(true)
    } catch (error) {
      clearAdminToken()
      setGateError(error.status === 401
        ? 'That secret phrase doesn’t match. Try again.'
        : 'Editor unlock is not configured yet. Check the Supabase function and secrets.')
    }
  }

  useEffect(() => {
    if (!isEditorRoute || isEditorUnlocked) return undefined

    const token = getStoredAdminToken()
    if (!token) return undefined

    let isMounted = true
    setIsCheckingEditorToken(true)

    validateEditorAccess({ adminToken: token })
      .then((result) => {
        if (!isMounted) return
        if (result.ok && result.adminToken) {
          storeAdminToken(result.adminToken)
          setIsEditorUnlocked(true)
        } else {
          clearAdminToken()
        }
      })
      .catch(() => {
        if (!isMounted) return
        clearAdminToken()
      })
      .finally(() => {
        if (isMounted) setIsCheckingEditorToken(false)
      })

    return () => {
      isMounted = false
    }
  }, [isEditorRoute, isEditorUnlocked])

  if (isEditorRoute && isCheckingEditorToken) {
    return (
      <div className="app-shell app-shell--editor">
        <div className="sync-banner">Checking editor access...</div>
      </div>
    )
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
        <AtlasEditor
          onBack={goPublic}
          onSave={persistState}
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
            onSelectState={selectState}
            onSelectMetro={selectMetro}
            onSelectPark={selectPark}
            parks={parkBoundaries}
            selectedPlace={selectedPlace}
            selectedStateCode={selectedStateCode}
            states={states}
          />
          <StateDetailPanel
            selectedItem={selectedPlace}
            state={selectedState}
            states={states}
          />
        </div>

        <Achievements achievements={achievements} />
      </main>
    </div>
  )
}

export default App
