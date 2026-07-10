import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured } from './firebaseClient'
import { loadStoredStates, saveStoredStates } from '../utils/storage'

const ENTRIES_COLLECTION = 'stateTravelEntries'

export { isFirebaseConfigured }

function toIsoDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value.toDate instanceof Function) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return ''
}

function toStateEntry(row = {}) {
  return {
    code: row.state_code,
    name: row.state_name,
    status: row.status,
    firstVisitedYear: row.first_visited_year ?? '',
    favoriteMemory: row.favorite_memory ?? '',
    badges: row.badges ?? [],
    vibeRating: row.vibe_rating ?? 0,
    honorableMention: Boolean(row.honorable_mention),
    citiesVisited: row.cities_visited ?? [],
    parksVisited: row.parks_visited ?? [],
    updatedAt: toIsoDate(row.updated_at),
  }
}

function toDatabaseEntry(entry) {
  return {
    state_code: entry.code,
    state_name: entry.name,
    status: entry.status,
    first_visited_year: entry.firstVisitedYear || null,
    favorite_memory: entry.favoriteMemory || null,
    badges: entry.badges ?? [],
    vibe_rating: entry.vibeRating || null,
    honorable_mention: Boolean(entry.honorableMention),
    cities_visited: entry.citiesVisited ?? [],
    parks_visited: entry.parksVisited ?? [],
  }
}

function getFirestoreWriteError(error) {
  const code = error?.code || ''
  const message = code.includes('permission-denied')
    ? 'This account is not allowed to edit this atlas.'
    : (error.message || 'Couldn’t save changes.')
  const nextError = new Error(message)
  nextError.status = code.includes('permission-denied') ? 403 : 500
  return nextError
}

export async function fetchStateTravelEntries() {
  if (!isFirebaseConfigured) {
    return loadStoredStates() ?? []
  }

  const db = getFirebaseDb()
  const snapshot = await getDocs(query(collection(db, ENTRIES_COLLECTION), orderBy('state_code')))

  return snapshot.docs.map((doc) => toStateEntry({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function upsertStateTravelEntry(entry) {
  if (!isFirebaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    const nextStates = storedStates.some((state) => state.code === entry.code)
      ? storedStates.map((state) => (state.code === entry.code ? entry : state))
      : [...storedStates, entry]
    saveStoredStates(nextStates)
    return { entry }
  }

  try {
    const db = getFirebaseDb()
    const ref = doc(db, ENTRIES_COLLECTION, entry.code)
    const databaseEntry = toDatabaseEntry(entry)

    await setDoc(ref, {
      ...databaseEntry,
      updated_at: serverTimestamp(),
    }, { merge: true })

    return {
      entry: toStateEntry(databaseEntry),
    }
  } catch (error) {
    throw getFirestoreWriteError(error)
  }
}

export async function deleteStateTravelEntry(entryIdOrStateCode) {
  if (!isFirebaseConfigured) {
    const storedStates = loadStoredStates() ?? []
    saveStoredStates(storedStates.filter((state) => state.code !== entryIdOrStateCode && state.id !== entryIdOrStateCode))
    return { success: true }
  }

  try {
    await deleteDoc(doc(getFirebaseDb(), ENTRIES_COLLECTION, entryIdOrStateCode))
    return { success: true }
  } catch (error) {
    throw getFirestoreWriteError(error)
  }
}
