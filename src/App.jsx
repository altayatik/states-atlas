import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { OverviewSection } from './components/OverviewSection'
import { EditorAuthGate } from './components/EditorAuthGate'
import { TravelNav } from './components/TravelNav'
import { states as defaultStates } from './data/states'
import { parkBoundaries } from './data/parkBoundaries'
import { evaluateAchievements } from './utils/achievements'
import { getRegionalProgress, getStats } from './utils/stats'
import { isPlaceOptionSelected } from './utils/places'
import { mergeStoredStates } from './utils/storage'
import './styles.css'

const Achievements = lazy(() => import('./components/Achievements').then((module) => ({ default: module.Achievements })))
const AtlasEditor = lazy(() => import('./components/AtlasEditor').then((module) => ({ default: module.AtlasEditor })))
const NationalParksEditor = lazy(() => import('./components/NationalParksEditor').then((module) => ({ default: module.NationalParksEditor })))
const NationalParksSection = lazy(() => import('./components/NationalParksSection').then((module) => ({ default: module.NationalParksSection })))
const StatesSection = lazy(() => import('./components/StatesSection').then((module) => ({ default: module.StatesSection })))

const ATLAS_ADMIN_EMAILS = [
  'altayatik01@gmail.com',
  'aidima821@gmail.com',
]

function isAtlasAdminUser(user) {
  return Boolean(user && ATLAS_ADMIN_EMAILS.includes(user.email) && user.emailVerified)
}

function runAfterFirstPaint(callback) {
  if (typeof window === 'undefined') {
    callback()
    return () => {}
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 1200 })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = window.setTimeout(callback, 120)
  return () => window.clearTimeout(timeoutId)
}

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
    if (!isEditorRoute) {
      setIsCheckingEditorAuth(false)
      return undefined
    }

    let unsubscribe = () => {}
    let isMounted = true
    setIsCheckingEditorAuth(true)

    import('./services/editorAuth').then(({ subscribeEditorAuth }) => {
      if (!isMounted) return
      unsubscribe = subscribeEditorAuth((user) => {
        setEditorUser(user)
        setGateError('')
        setIsCheckingEditorAuth(false)
      })
    }).catch((error) => {
      console.warn('Unable to load editor auth.', error)
      if (isMounted) {
        setEditorUser(null)
        setIsCheckingEditorAuth(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [isEditorRoute])

  useEffect(() => {
    let isMounted = true
    let cancelScheduledLoad = () => {}

    async function loadEntries() {
      try {
        const { fetchStateTravelEntries } = await import('./services/stateTravelApi')
        const entries = await fetchStateTravelEntries()
        if (isMounted) setStates(mergeStoredStates(defaultStates, entries))
      } catch (error) {
        console.warn('Unable to load Firebase entries. Showing static atlas data.', error)
        if (isMounted) setStates(defaultStates)
      } finally {
        if (isMounted) setIsLoadingEntries(false)
      }
    }

    cancelScheduledLoad = isEditorRoute ? (() => {
      loadEntries()
      return () => {}
    })() : runAfterFirstPaint(loadEntries)

    return () => {
      isMounted = false
      cancelScheduledLoad()
    }
  }, [isEditorRoute])

  useEffect(() => {
    let isMounted = true
    let cancelScheduledLoad = () => {}

    async function loadRankings() {
      setParksLoadError('')

      try {
        const { fetchParkRankings } = await import('./services/parksApi')
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

    cancelScheduledLoad = isEditorRoute ? (() => {
      loadRankings()
      return () => {}
    })() : runAfterFirstPaint(loadRankings)

    return () => {
      isMounted = false
      cancelScheduledLoad()
    }
  }, [isEditorRoute])

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
    const { fetchStateTravelEntries } = await import('./services/stateTravelApi')
    const entries = await fetchStateTravelEntries()
    setStates(mergeStoredStates(defaultStates, entries))
  }

  const persistState = async (draft) => {
    const { isFirebaseConfigured, upsertStateTravelEntry } = await import('./services/stateTravelApi')
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
      const { signInToEditor } = await import('./services/editorAuth')
      await signInToEditor()
    } catch (error) {
      setGateError(error.message || 'Couldn’t sign in with Google.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleEditorSignOut = async () => {
    setGateError('')
    const { signOutOfEditor } = await import('./services/editorAuth')
    await signOutOfEditor()
  }

  const refreshParkRankings = async () => {
    const { fetchParkRankings } = await import('./services/parksApi')
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

      const { upsertStateTravelEntry } = await import('./services/stateTravelApi')
      await upsertStateTravelEntry({
        ...state,
        parksVisited: uniquePlaces([...(state.parksVisited ?? []), marker.name]),
        updatedAt: new Date().toISOString(),
      })
    }))
  }

  const persistParkRanking = async (draft) => {
    const { createParkRanking, updateParkRanking } = await import('./services/parksApi')
    const savedRanking = draft.id
      ? await updateParkRanking(draft.id, draft)
      : await createParkRanking(draft)

    await syncParkRankingToStates(savedRanking)
    await refreshParkRankings()
    await refreshEntries()
    return savedRanking
  }

  const removeParkRanking = async (rankingId) => {
    const { deleteParkRanking } = await import('./services/parksApi')
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

  if (isEditorRoute && !isAtlasAdminUser(editorUser)) {
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
            <Suspense fallback={<div className="sync-banner">Loading park editor...</div>}>
              <NationalParksEditor
                isLoading={isLoadingParks}
                onDelete={removeParkRanking}
                onSave={persistParkRanking}
                rankings={parkRankings}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="sync-banner">Loading atlas editor...</div>}>
              <AtlasEditor
                hideHeader
                onBack={goPublic}
                onSave={persistState}
                states={atlasStates}
              />
            </Suspense>
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
        <Suspense fallback={<div className="sync-banner">Loading park wall...</div>}>
          <NationalParksSection
            activeScope={activeParkScope}
            isLoading={isLoadingParks}
            loadError={parksLoadError}
            rankings={parkRankings}
          />
        </Suspense>
      ) : activeSection === 'achievements' ? (
        <Suspense fallback={<div className="sync-banner">Loading milestones...</div>}>
          <Achievements achievements={achievements} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="sync-banner">Loading map...</div>}>
          <StatesSection
            onSelectMetro={selectMetro}
            onSelectPark={selectPark}
            onSelectState={selectState}
            parks={parkBoundaries}
            selectedPlace={selectedPlace}
            selectedState={selectedState}
            selectedStateCode={selectedStateCode}
            states={atlasStates}
            stats={stats}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
