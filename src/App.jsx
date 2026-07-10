import { useEffect, useMemo, useState } from 'react'
import { AtlasHeader } from './components/AtlasHeader'
import { StatsCards } from './components/StatsCards'
import { TravelMap } from './components/TravelMap'
import { StateDetailPanel } from './components/StateDetailPanel'
import { Achievements } from './components/Achievements'
import { AtlasEditor } from './components/AtlasEditor'
import { PasswordGate } from './components/PasswordGate'
import { NationalParksEditor } from './components/NationalParksEditor'
import { NationalParksSection } from './components/NationalParksSection'
import { TravelNav } from './components/TravelNav'
import { states as defaultStates } from './data/states'
import { metroAreas } from './data/metroAreas'
import { parkBoundaries } from './data/parkBoundaries'
import { evaluateAchievements } from './utils/achievements'
import { getRegionalProgress, getStats } from './utils/stats'
import { isPlaceOptionSelected } from './utils/places'
import { mergeStoredStates } from './utils/storage'
import {
  clearAdminToken,
  fetchStateTravelEntries,
  getStoredAdminToken,
  isFirebaseConfigured,
  storeAdminToken,
  upsertStateTravelEntry,
  validateEditorAccess,
} from './services/stateTravelApi'
import {
  clearParkAdminToken,
  createParkRanking,
  deleteParkRanking,
  fetchParkRankings,
  getStoredParkAdminToken,
  updateParkRanking,
} from './services/parksApi'
import './styles.css'

function getParkMarkerForRanking(ranking) {
  if (!ranking || ranking.isCustom) return null

  return parkBoundaries.find((park) => isPlaceOptionSelected([park.name], ranking.parkName))
}

function uniquePlaces(items) {
  const result = []

  items.forEach((item) => {
    if (!item || isPlaceOptionSelected(result, item)) return
    result.push(item)
  })

  return result
}

function mergeStatesWithParkRankings(states, rankings) {
  if (!rankings.length) return states

  const parksByState = new Map()

  rankings.forEach((ranking) => {
    const marker = getParkMarkerForRanking(ranking)
    if (!marker) return

    marker.stateCodes.forEach((code) => {
      const parks = parksByState.get(code) ?? []
      parks.push(marker.name)
      parksByState.set(code, parks)
    })
  })

  if (!parksByState.size) return states

  return states.map((state) => {
    const rankingParks = parksByState.get(state.code)
    if (!rankingParks?.length) return state

    return {
      ...state,
      parksVisited: uniquePlaces([...(state.parksVisited ?? []), ...rankingParks]),
    }
  })
}

function getIsEditorRoute() {
  if (typeof window === 'undefined') return false
  return window.location.hash.startsWith('#/edit')
    || window.location.pathname.endsWith('/atlas/edit')
    || window.location.pathname.endsWith('/atlas/edit/')
}

function getActiveSection() {
  if (typeof window === 'undefined') return 'states'
  if (window.location.hash.startsWith('#/parks')) return 'parks'
  return 'states'
}

function getActiveParkScope() {
  if (typeof window === 'undefined') return 'us'
  const [, queryString = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(queryString)
  const scope = params.get('scope')
  return ['us', 'canada', 'all'].includes(scope) ? scope : 'us'
}

function getActiveEditorSection() {
  if (typeof window === 'undefined') return 'states'
  const [, queryString = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(queryString)
  return params.get('section') === 'parks' ? 'parks' : 'states'
}

function App() {
  const [states, setStates] = useState(defaultStates)
  const [parkRankings, setParkRankings] = useState([])
  const [selectedStateCode, setSelectedStateCode] = useState('')
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [isLoadingParks, setIsLoadingParks] = useState(true)
  const [parksLoadError, setParksLoadError] = useState('')
  const [isEditorRoute, setIsEditorRoute] = useState(getIsEditorRoute)
  const [activeSection, setActiveSection] = useState(getActiveSection)
  const [activeParkScope, setActiveParkScope] = useState(getActiveParkScope)
  const [activeEditorSection, setActiveEditorSection] = useState(getActiveEditorSection)
  const [isEditorUnlocked, setIsEditorUnlocked] = useState(false)
  const [isCheckingEditorToken, setIsCheckingEditorToken] = useState(false)
  const [editorSecretPhrase, setEditorSecretPhrase] = useState('')
  const [gateError, setGateError] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)

  useEffect(() => {
    const updateRoute = () => {
      setIsEditorRoute(getIsEditorRoute())
      setActiveSection(getActiveSection())
      setActiveParkScope(getActiveParkScope())
      setActiveEditorSection(getActiveEditorSection())
    }

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
        console.warn('Unable to load Firebase entries. Showing static atlas data.', error)
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

  useEffect(() => {
    let isMounted = true

    async function loadRankings() {
      setParksLoadError('')

      try {
        const rankings = await fetchParkRankings()
        if (isMounted) setParkRankings(rankings)
      } catch (error) {
        console.warn('Unable to load park rankings from Firebase.', error)
        if (isMounted) {
          setParkRankings([])
          setParksLoadError('Unable to load National Parks rankings from Firebase.')
        }
      } finally {
        if (isMounted) setIsLoadingParks(false)
      }
    }

    loadRankings()

    return () => {
      isMounted = false
    }
  }, [])

  const atlasStates = useMemo(
    () => mergeStatesWithParkRankings(states, parkRankings),
    [parkRankings, states],
  )
  const selectedState = atlasStates.find((state) => state.code === selectedStateCode)
  const stats = useMemo(() => getStats(atlasStates), [atlasStates])
  const regions = useMemo(() => getRegionalProgress(atlasStates), [atlasStates])
  const achievements = useMemo(() => evaluateAchievements(atlasStates), [atlasStates])

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
    window.location.href = `${import.meta.env.BASE_URL}#/states`
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

      if (isFirebaseConfigured) {
        await refreshEntries()
      } else {
        setStates((current) => current.map((state) => (state.code === draft.code ? draft : state)))
      }

      setSelectedStateCode(draft.code)
      return draft
    } catch (error) {
      if (error.status === 401) {
        clearAdminToken()
        clearParkAdminToken()
        setIsEditorUnlocked(false)
        setEditorSecretPhrase('')
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
      setEditorSecretPhrase(secretPhrase.trim())

      setIsEditorUnlocked(true)
    } catch (error) {
      clearAdminToken()
      clearParkAdminToken()
      setEditorSecretPhrase('')
      setGateError(error.status === 401
        ? 'That secret phrase doesn’t match. Try again.'
        : 'Editor unlock is not configured yet. Check the Firebase function and secrets.')
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
          clearParkAdminToken()
        }
      })
      .catch(() => {
        if (!isMounted) return
        clearAdminToken()
        clearParkAdminToken()
      })
      .finally(() => {
        if (isMounted) setIsCheckingEditorToken(false)
      })

    return () => {
      isMounted = false
    }
  }, [isEditorRoute, isEditorUnlocked])

  const refreshParkRankings = async () => {
    const rankings = await fetchParkRankings()
    setParkRankings(rankings)
    return rankings
  }

  const getParkAuth = () => ({
    adminToken: getStoredParkAdminToken() || getStoredAdminToken(),
    secretPhrase: editorSecretPhrase || undefined,
  })

  const syncParkRankingToStates = async (ranking) => {
    const marker = getParkMarkerForRanking(ranking)
    if (!marker) return

    await Promise.all(marker.stateCodes.map(async (code) => {
      const state = states.find((item) => item.code === code)
      if (!state) return
      if (isPlaceOptionSelected(state.parksVisited ?? [], marker.name)) return

      await upsertStateTravelEntry({
        ...state,
        parksVisited: uniquePlaces([...(state.parksVisited ?? []), marker.name]),
        updatedAt: new Date().toISOString(),
      }, {
        adminToken: getStoredAdminToken(),
      })
    }))
  }

  const persistParkRanking = async (draft) => {
    try {
      const savedRanking = draft.id
        ? await updateParkRanking(draft.id, draft, getParkAuth())
        : await createParkRanking(draft, getParkAuth())

      await syncParkRankingToStates(savedRanking)
      await refreshParkRankings()
      await refreshEntries()
      return savedRanking
    } catch (error) {
      if (error.status === 401) {
        clearParkAdminToken()
        if (!editorSecretPhrase) {
          clearAdminToken()
          setIsEditorUnlocked(false)
          setGateError('Your edit session expired. Unlock the editor again.')
        }
      }

      throw error
    }
  }

  const removeParkRanking = async (rankingId) => {
    try {
      await deleteParkRanking(rankingId, getParkAuth())
      await refreshParkRankings()
    } catch (error) {
      if (error.status === 401) {
        clearParkAdminToken()
        if (!editorSecretPhrase) {
          clearAdminToken()
          setIsEditorUnlocked(false)
          setGateError('Your edit session expired. Unlock the editor again.')
        }
      }

      throw error
    }
  }

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
        {(isLoadingEntries || isLoadingParks) && <div className="sync-banner">Loading atlas entries...</div>}
        <main className="editor-page">
          <header className="editor-header">
            <div>
              <p className="eyebrow">Private dashboard</p>
              <h1>Travel Atlas Editor</h1>
              <p>Update state memories and National Parks rankings from one shared edit area.</p>
            </div>
            <button className="button button--secondary" type="button" onClick={goPublic}>
              Back to public atlas
            </button>
          </header>

          <nav className="editor-tabs" aria-label="Editor sections">
            <a className={activeEditorSection === 'states' ? 'is-active' : ''} href="#/edit?section=states">States</a>
            <a className={activeEditorSection === 'parks' ? 'is-active' : ''} href="#/edit?section=parks">National Parks</a>
          </nav>

          {activeEditorSection === 'parks' ? (
            <NationalParksEditor
              isLoading={isLoadingParks}
              onDelete={removeParkRanking}
              onSave={persistParkRanking}
              rankings={parkRankings}
            />
          ) : (
            <AtlasEditor
              hideHeader
              onBack={goPublic}
              onSave={persistState}
              states={atlasStates}
            />
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AtlasHeader />
      <TravelNav activeSection={activeSection} />
      {isLoadingEntries && activeSection === 'states' && <div className="sync-banner">Loading atlas entries...</div>}
      {isLoadingParks && activeSection === 'parks' && <div className="sync-banner">Loading park rankings...</div>}

      {activeSection === 'parks' ? (
        <NationalParksSection
          activeScope={activeParkScope}
          isLoading={isLoadingParks}
          loadError={parksLoadError}
          rankings={parkRankings}
        />
      ) : (
        <>
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
                states={atlasStates}
              />
              <StateDetailPanel
                selectedItem={selectedPlace}
                state={selectedState}
                states={atlasStates}
              />
            </div>

            <Achievements achievements={achievements} />
          </main>
        </>
      )}
    </div>
  )
}

export default App
