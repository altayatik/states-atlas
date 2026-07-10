import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseDb, getFirebaseFunctions, isFirebaseConfigured } from './firebaseClient'
import { getOfficialParkByName, getOfficialParkCountry } from '../data/nationalParks'
import { normalizeScores, sortRankings } from '../utils/parkScoring'

const PARK_ADMIN_TOKEN_KEY = 'travelAtlasParkAdminToken'
const RANKINGS_COLLECTION = 'parkRankings'
const ADMIN_FUNCTION = 'parksAdmin'

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
  return {
    createdAt: toIsoDate(row.created_at),
    honorableMention: Boolean(row.honorable_mention),
    id: row.id,
    isCustom: Boolean(row.is_custom),
    notes: row.notes ?? '',
    parkCode: row.park_code ?? '',
    parkName: row.park_name,
    scores: normalizeScores({
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
    trails: scores.trails,
    visited_date: ranking.visitedDate || null,
    visitor_center: scores.visitorCenter,
  }
}

function getCallable() {
  const functions = getFirebaseFunctions()
  if (!functions) return null
  return httpsCallable(functions, ADMIN_FUNCTION)
}

function getCallableStatus(error) {
  const code = error?.code || ''
  return code.includes('unauthenticated') || code.includes('permission-denied') ? 401 : 500
}

export function getStoredParkAdminToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(PARK_ADMIN_TOKEN_KEY) || ''
}

export function storeParkAdminToken(token) {
  if (typeof window === 'undefined' || !token) return
  window.sessionStorage.setItem(PARK_ADMIN_TOKEN_KEY, token)
}

export function clearParkAdminToken() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PARK_ADMIN_TOKEN_KEY)
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

async function mutateParkRanking(action, body, auth = {}) {
  if (!isFirebaseConfigured) {
    throw new Error('Shared park rankings are not configured.')
  }

  const callAdmin = getCallable()
  if (!callAdmin) {
    throw new Error('Shared park rankings are not configured.')
  }

  try {
    const result = await callAdmin({
      action,
      adminToken: auth.adminToken || getStoredParkAdminToken() || undefined,
      secretPhrase: auth.secretPhrase || undefined,
      ...body,
    })

    if (result.data?.adminToken) {
      storeParkAdminToken(result.data.adminToken)
    }

    return result.data
  } catch (error) {
    const status = getCallableStatus(error)
    const nextError = new Error(status === 401 ? 'That secret phrase doesn’t match. Try again.' : (error.message || 'The park rankings request failed.'))
    nextError.status = status
    throw nextError
  }
}

export async function createParkRanking(ranking, auth) {
  const payload = await mutateParkRanking('create', {
    ranking: toDatabaseRanking(ranking),
  }, auth)

  return toParkRanking(payload.ranking)
}

export async function updateParkRanking(id, ranking, auth) {
  const payload = await mutateParkRanking('update', {
    id,
    ranking: toDatabaseRanking(ranking),
  }, auth)

  return toParkRanking(payload.ranking)
}

export async function deleteParkRanking(id, auth) {
  await mutateParkRanking('delete', { id }, auth)
}
