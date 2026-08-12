import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured } from './firebaseClient'
import { getOfficialParkByName, getOfficialParkCountry } from '../data/nationalParks'
import { normalizeLegacyScores, normalizeScores, SCORE_SCALE, sortRankings } from '../utils/parkScoring'

const RANKINGS_COLLECTION = 'parkRankings'

export const isParksFirebaseConfigured = isFirebaseConfigured

function toIsoDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value.toDate instanceof Function) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return ''
}

function getParkState(parkName, isCustom) {
  if (isCustom) return 'Custom'
  return getOfficialParkByName(parkName)?.state || ''
}

function toParkRanking(row = {}) {
  const scoreNormalizer = row.score_scale === SCORE_SCALE ? normalizeScores : normalizeLegacyScores

  return {
    createdAt: toIsoDate(row.created_at),
    honorableMention: Boolean(row.honorable_mention),
    id: row.id,
    isCustom: Boolean(row.is_custom),
    notes: row.notes ?? '',
    parkCode: row.park_code ?? '',
    parkName: row.park_name,
    scores: scoreNormalizer({
      facilities: row.facilities,
      roads: row.roads,
      scenery: row.scenery,
      trails: row.trails,
      visitorCenter: row.visitor_center,
    }),
    source: 'firebase',
    state: getParkState(row.park_name, row.is_custom),
    country: getOfficialParkCountry(row.park_name),
    updatedAt: toIsoDate(row.updated_at),
    visitedDate: row.visited_date ?? '',
  }
}

function toDatabaseRanking(ranking) {
  const scores = normalizeScores(ranking.scores)

  return {
    facilities: scores.facilities,
    honorable_mention: Boolean(ranking.honorableMention),
    is_custom: Boolean(ranking.isCustom),
    notes: ranking.notes || '',
    park_code: ranking.parkCode || null,
    park_name: ranking.parkName,
    roads: scores.roads,
    scenery: scores.scenery,
    score_scale: SCORE_SCALE,
    trails: scores.trails,
    visited_date: ranking.visitedDate || null,
    visitor_center: scores.visitorCenter,
  }
}

function getFirestoreWriteError(error) {
  const code = error?.code || ''
  const message = code.includes('permission-denied')
    ? 'This account is not allowed to edit this atlas.'
    : (error.message || 'The park rankings request failed.')
  const nextError = new Error(message)
  nextError.status = code.includes('permission-denied') ? 403 : 500
  return nextError
}

export async function fetchParkRankings() {
  if (!isFirebaseConfigured) return []

  const db = getFirebaseDb()
  const snapshot = await getDocs(collection(db, RANKINGS_COLLECTION))

  return sortRankings(snapshot.docs.map((doc) => toParkRanking({
    id: doc.id,
    ...doc.data(),
  })))
}

async function saveParkRanking(id, ranking) {
  if (!isFirebaseConfigured) {
    throw new Error('Shared park rankings are not configured.')
  }

  try {
    const db = getFirebaseDb()
    const databaseRanking = toDatabaseRanking(ranking)

    if (id) {
      await setDoc(doc(db, RANKINGS_COLLECTION, id), {
        ...databaseRanking,
        updated_at: serverTimestamp(),
      }, { merge: true })

      return {
        ranking: {
          id,
          ...databaseRanking,
        },
      }
    }

    const ref = await addDoc(collection(db, RANKINGS_COLLECTION), {
      ...databaseRanking,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })

    return {
      ranking: {
        id: ref.id,
        ...databaseRanking,
      },
    }
  } catch (error) {
    throw getFirestoreWriteError(error)
  }
}

export async function createParkRanking(ranking) {
  const payload = await saveParkRanking('', ranking)
  return toParkRanking(payload.ranking)
}

export async function updateParkRanking(id, ranking) {
  const payload = await saveParkRanking(id, ranking)
  return toParkRanking(payload.ranking)
}

export async function deleteParkRanking(id) {
  if (!isFirebaseConfigured) {
    throw new Error('Shared park rankings are not configured.')
  }

  try {
    await deleteDoc(doc(getFirebaseDb(), RANKINGS_COLLECTION, id))
  } catch (error) {
    throw getFirestoreWriteError(error)
  }
}
