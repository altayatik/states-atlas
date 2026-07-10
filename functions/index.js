import crypto from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

initializeApp()

const adminSecretPhrase = defineSecret('ADMIN_SECRET_PHRASE')
const adminTokenSecret = defineSecret('ADMIN_TOKEN_SECRET')

const allowedOrigins = [
  'https://altayatik.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

const allowedStatuses = new Set([
  'not_visited',
  'passed_through',
  'visited',
  'stayed_overnight',
  'lived_there',
  'favorite',
])

const allowedBadges = new Set([
  'best_food',
  'best_nature',
  'best_city',
  'best_road_trip',
  'best_surprise',
  'want_revisit',
  'would_live',
  'chaotic_memorable',
])

const scoreFields = ['facilities', 'roads', 'scenery', 'trails', 'visitor_center']
const tokenLifetimeSeconds = 60 * 60 * 2

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function createAdminToken(secret) {
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(JSON.stringify({
    exp: now + tokenLifetimeSeconds,
    iat: now,
  }))
  return `${payload}.${signPayload(payload, secret)}`
}

function verifyAdminToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, signPayload(payload, secret))) return false

  try {
    const decoded = JSON.parse(base64UrlDecode(payload))
    return typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function authorize(data) {
  const phrase = adminSecretPhrase.value()
  const tokenSecret = adminTokenSecret.value()

  if (!phrase || !tokenSecret) {
    throw new HttpsError('failed-precondition', 'Editor unlock is not configured yet.')
  }

  const secretPhrase = typeof data.secretPhrase === 'string' ? data.secretPhrase.trim() : ''
  const adminToken = typeof data.adminToken === 'string' ? data.adminToken.trim() : ''

  if (secretPhrase && safeEqual(secretPhrase, phrase)) return createAdminToken(tokenSecret)
  if (verifyAdminToken(adminToken, tokenSecret)) return createAdminToken(tokenSecret)

  throw new HttpsError('unauthenticated', 'Invalid secret phrase')
}

function validateStringArray(value, maxLength, allowed) {
  return Array.isArray(value)
    && value.every((item) => (
      typeof item === 'string'
        && item.length <= maxLength
        && (!allowed || allowed.has(item))
    ))
}

function validateStateEntry(entry) {
  if (!entry || typeof entry !== 'object') return 'Entry is required.'
  if (typeof entry.state_code !== 'string' || !/^([A-Z]{2}|CAN)$/.test(entry.state_code)) return 'State code must be a two-letter code or CAN.'
  if (typeof entry.state_name !== 'string' || entry.state_name.length < 1 || entry.state_name.length > 80) return 'State name is required and must be 80 characters or fewer.'
  if (typeof entry.status !== 'string' || !allowedStatuses.has(entry.status)) return 'Status is not allowed.'
  if (entry.first_visited_year !== null && entry.first_visited_year !== undefined) {
    if (!Number.isInteger(entry.first_visited_year) || entry.first_visited_year < 1900 || entry.first_visited_year > 2100) {
      return 'First visited year must be between 1900 and 2100.'
    }
  }
  if (entry.favorite_memory !== null && entry.favorite_memory !== undefined) {
    if (typeof entry.favorite_memory !== 'string' || entry.favorite_memory.length > 1000) return 'Favorite memory is too long.'
  }
  if (!validateStringArray(entry.badges ?? [], 80, allowedBadges)) return 'Badges contain an unknown value.'
  if (entry.vibe_rating !== null && entry.vibe_rating !== undefined) {
    if (!Number.isInteger(entry.vibe_rating) || entry.vibe_rating < 1 || entry.vibe_rating > 5) return 'Vibe rating must be 1 through 5.'
  }
  if (typeof entry.honorable_mention !== 'boolean') return 'Honorable mention must be true or false.'
  if (!validateStringArray(entry.cities_visited ?? [], 100)) return 'Cities visited contains an invalid value.'
  if (!validateStringArray(entry.parks_visited ?? [], 120)) return 'Parks visited contains an invalid value.'
  return ''
}

function cleanStateEntry(entry) {
  return {
    state_code: entry.state_code,
    state_name: entry.state_name,
    status: entry.status,
    first_visited_year: entry.first_visited_year ?? null,
    favorite_memory: entry.favorite_memory ?? null,
    badges: entry.badges ?? [],
    vibe_rating: entry.vibe_rating ?? null,
    honorable_mention: Boolean(entry.honorable_mention),
    cities_visited: entry.cities_visited ?? [],
    parks_visited: entry.parks_visited ?? [],
  }
}

function validateParkRanking(ranking) {
  if (!ranking || typeof ranking !== 'object') return 'Ranking is required.'
  if (typeof ranking.park_name !== 'string' || ranking.park_name.trim().length < 1 || ranking.park_name.length > 160) return 'Park name is required.'
  if (ranking.park_code !== null && ranking.park_code !== undefined && typeof ranking.park_code !== 'string') return 'Park code must be text.'
  if (typeof ranking.is_custom !== 'boolean') return 'Custom park must be true or false.'
  if (typeof ranking.honorable_mention !== 'boolean') return 'Honorable mention must be true or false.'
  if (ranking.notes !== null && ranking.notes !== undefined && (typeof ranking.notes !== 'string' || ranking.notes.length > 1000)) return 'Notes must be 1000 characters or fewer.'
  if (ranking.visited_date !== null && ranking.visited_date !== undefined && ranking.visited_date !== '') {
    if (typeof ranking.visited_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ranking.visited_date)) return 'Visited date must use YYYY-MM-DD.'
  }

  for (const field of scoreFields) {
    if (!Number.isInteger(ranking[field]) || ranking[field] < 1 || ranking[field] > 10) {
      return 'Park scores must be integers from 1 through 10.'
    }
  }

  return ''
}

function cleanParkRanking(ranking) {
  return {
    facilities: ranking.facilities,
    honorable_mention: Boolean(ranking.honorable_mention),
    is_custom: Boolean(ranking.is_custom),
    notes: ranking.notes || '',
    park_code: ranking.park_code || null,
    park_name: ranking.park_name.trim(),
    roads: ranking.roads,
    scenery: ranking.scenery,
    trails: ranking.trails,
    visited_date: ranking.visited_date || null,
    visitor_center: ranking.visitor_center,
  }
}

export const statesAdmin = onCall({
  cors: allowedOrigins,
  region: 'us-central1',
  secrets: [adminSecretPhrase, adminTokenSecret],
}, async (request) => {
  const data = request.data ?? {}
  const adminToken = authorize(data)

  if (data.action === 'validate') {
    return { adminToken, ok: true }
  }

  const db = getFirestore()

  if (data.action === 'upsert') {
    const validationError = validateStateEntry(data.entry)
    if (validationError) throw new HttpsError('invalid-argument', validationError)

    const entry = cleanStateEntry(data.entry)
    const docRef = db.collection('stateTravelEntries').doc(entry.state_code)
    const snapshot = await docRef.get()
    const nextEntry = {
      ...entry,
      created_at: snapshot.exists ? snapshot.get('created_at') : FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }

    await docRef.set(nextEntry, { merge: false })
    const saved = await docRef.get()

    return { adminToken, entry: saved.data(), ok: true }
  }

  if (data.action === 'delete') {
    const id = typeof data.id === 'string' ? data.id : ''
    const stateCode = typeof data.state_code === 'string' ? data.state_code : ''
    const docId = /^([A-Z]{2}|CAN)$/.test(stateCode) ? stateCode : id
    if (!docId) throw new HttpsError('invalid-argument', 'Delete requires an id or state_code.')

    await db.collection('stateTravelEntries').doc(docId).delete()
    return { adminToken, deleted: [{ id: docId }], ok: true, success: true }
  }

  throw new HttpsError('invalid-argument', 'Unsupported action.')
})

export const parksAdmin = onCall({
  cors: allowedOrigins,
  region: 'us-central1',
  secrets: [adminSecretPhrase, adminTokenSecret],
}, async (request) => {
  const data = request.data ?? {}
  const adminToken = authorize(data)
  const db = getFirestore()

  if (data.action === 'create') {
    const validationError = validateParkRanking(data.ranking)
    if (validationError) throw new HttpsError('invalid-argument', validationError)

    const ranking = {
      ...cleanParkRanking(data.ranking),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }
    const docRef = await db.collection('parkRankings').add(ranking)
    const saved = await docRef.get()

    return {
      adminToken,
      ok: true,
      ranking: { id: docRef.id, ...saved.data() },
    }
  }

  if (data.action === 'update') {
    const id = typeof data.id === 'string' ? data.id : ''
    if (!id) throw new HttpsError('invalid-argument', 'Update requires a ranking id.')

    const validationError = validateParkRanking(data.ranking)
    if (validationError) throw new HttpsError('invalid-argument', validationError)

    const docRef = db.collection('parkRankings').doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) throw new HttpsError('not-found', 'Ranking not found.')

    const ranking = {
      ...cleanParkRanking(data.ranking),
      created_at: snapshot.get('created_at') || FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }
    await docRef.set(ranking, { merge: false })
    const saved = await docRef.get()

    return {
      adminToken,
      ok: true,
      ranking: { id, ...saved.data() },
    }
  }

  if (data.action === 'delete') {
    const id = typeof data.id === 'string' ? data.id : ''
    if (!id) throw new HttpsError('invalid-argument', 'Delete requires a ranking id.')

    await db.collection('parkRankings').doc(id).delete()
    return { adminToken, ok: true, success: true }
  }

  throw new HttpsError('invalid-argument', 'Unsupported action.')
})
