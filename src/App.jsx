import { useEffect, useMemo, useState } from 'react'
import { OverviewSection } from './components/OverviewSection'
import { StatsCards } from './components/StatsCards'
import { TravelMap } from './components/TravelMap'
import { StateDetailPanel } from './components/StateDetailPanel'
import { Achievements } from './components/Achievements'
import { AtlasEditor } from './components/AtlasEditor'
import { EditorAuthGate } from './components/EditorAuthGate'
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
  fetchStateTravelEntries,
  isFirebaseConfigured,
  upsertStateTravelEntry,
} from './services/stateTravelApi'
import {
  createParkRanking,
  deleteParkRanking,
  fetchParkRankings,
  updateParkRanking,
} from './services/parksApi'
import {
  isAtlasAdmin,
  signInToEditor,
  signOutOfEditor,
  subscribeEditorAuth,
} from './services/editorAuth'
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
  if (typeof window === 'undefined') return 'overview'
  if (window.location.hash.startsWith('#/overview')) return 'overview'
  if (window.location.hash.startsWith('#/states')) return 'states'
  if (window.location.hash.startsWith('#/parks')) return 'parks'
  if (window.location.hash.startsWith('#/achievements')) return 'achievements'
  return 'overview'
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
  const [editorUser, setEditorUser] = useState(null)
  const [isCheckingEditorAuth, setIsCheckingEditorAuth] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
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
    setIsCheckingEditorAuth(true)
    return subscribeEditorAuth((user) => {
      setEditorUser(user)
      setGateError('')
      setIsCheckingEditorAuth(false)
    })
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
  const stats = useMemo(() => ({
    ...getStats(atlasStates),
    parksRanked: parkRankings.length,
  }), [atlasStates, parkRankings.length])
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
    await upsertStateTravelEntry(draft)

    if (isFirebaseConfigured) {
      await refreshEntries()
    } else {
      setStates((current) => current.map((state) => (state.code === draft.code ? draft : state)))
    }

    setSelectedStateCode(draft.code)
    return draft
  }

  const handleEditorSignIn = async () => {
    setGateError('')
    setIsSigningIn(true)

    try {
      await signInToEditor()
    } catch (error) {
      setGateError(error.message || 'Couldn’t sign in with Google.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEditorSignOut = async () => {
    setGateError('')
    await signOutOfEditor()
  }

  const refreshParkRankings = async () => {
    const rankings = await fetchParkRankings()
    setParkRankings(rankings)
    return rankings
  }

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
      })
    }))
  }

  const persistParkRanking = async (draft) => {
    const savedRanking = draft.id
      ? await updateParkRanking(draft.id, draft)
      : await createParkRanking(draft)

    await syncParkRankingToStates(savedRanking)
    await refreshParkRankings()
    await refreshEntries()
    return savedRanking
  }

  const removeParkRanking = async (rankingId) => {
    await deleteParkRanking(rankingId)
    await refreshParkRankings()
  }

  if (isEditorRoute && isCheckingEditorAuth) {
    return (
      <div className="shell shell--editor">
        <div className="sync-banner">Checking editor access...</div>
      </div>
    )
  }

  if (isEditorRoute && !isAtlasAdmin(editorUser)) {
    return (
      <div className="shell shell--editor">
        <EditorAuthGate
          error={gateError}
          isSigningIn={isSigningIn}
          onBack={goPublic}
          onSignIn={handleEditorSignIn}
          onSignOut={handleEditorSignOut}
          user={editorUser}
        />
      </div>
    )
  }

  if (isEditorRoute) {
    return (
      <div className="shell shell--editor">
        {(isLoadingEntries || isLoadingParks) && <div className="sync-banner">Loading atlas entries...</div>}
        <main className="editor-page">
          <header className="editor-header glass-panel">
            <div>
              <p className="eyebrow">Private dashboard</p>
              <h1>Travel Atlas Editor</h1>
              <p>Update state memories and National Parks rankings from one shared, admin-only studio.</p>
            </div>
            <div className="editor-header__actions">
              <button className="button button--secondary" type="button" onClick={goPublic}>
                Back to atlas
              </button>
              <button className="button button--ghost" type="button" onClick={handleEditorSignOut}>
                Sign out
              </button>
            </div>
          </header>

          <nav className="editor-tabs glass-nav" aria-label="Editor sections">
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
    <div className="shell">
      <TravelNav activeSection={activeSection} />
      {isLoadingEntries && ['overview', 'states', 'achievements'].includes(activeSection) && (
        <div className="sync-banner">Loading atlas entries...</div>
      )}
      {isLoadingParks && ['overview', 'parks'].includes(activeSection) && (
        <div className="sync-banner">Loading park rankings...</div>
      )}

      {activeSection === 'overview' ? (
        <OverviewSection
          achievements={achievements}
          parkRankings={parkRankings}
          regions={regions}
          states={atlasStates}
          stats={stats}
        />
      ) : activeSection === 'parks' ? (
        <NationalParksSection
          activeScope={activeParkScope}
          isLoading={isLoadingParks}
          loadError={parksLoadError}
          rankings={parkRankings}
        />
      ) : activeSection === 'achievements' ? (
        <main className="page page--achievements">
          <Achievements achievements={achievements} />
        </main>
      ) : (
        <main className="page page--states">
          <div className="page-heading">
            <div>
              <p className="eyebrow">States &amp; provinces</p>
              <h1>Where we&rsquo;ve been</h1>
            </div>
            <p className="page-heading__note">
              {stats.statesVisited} of {stats.statesTotal} states so far — tap any state for the story.
            </p>
          </div>
          <StatsCards regions={regions} stats={stats} />

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
        </main>
      )}
    </div>
  )
}

export default App
