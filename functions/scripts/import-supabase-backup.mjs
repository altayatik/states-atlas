import fs from 'node:fs/promises'
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

function getArg(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : ''
}

function parseDate(value) {
  if (!value) return FieldValue.serverTimestamp()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? FieldValue.serverTimestamp() : date
}

async function readJsonArray(path) {
  const rows = JSON.parse(await fs.readFile(path, 'utf8'))
  if (!Array.isArray(rows)) throw new Error(`${path} must contain a JSON array.`)
  return rows
}

async function initializeAdmin() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  initializeApp({
    credential: credentialPath
      ? cert(JSON.parse(await fs.readFile(credentialPath, 'utf8')))
      : applicationDefault(),
  })
}

async function importStates(db, path) {
  if (!path) return 0
  const rows = await readJsonArray(path)
  const batch = db.batch()

  rows.forEach((row) => {
    if (!row?.state_code) throw new Error('Every state row must include state_code.')
    batch.set(db.collection('stateTravelEntries').doc(row.state_code), {
      state_code: row.state_code,
      state_name: row.state_name,
      status: row.status,
      first_visited_year: row.first_visited_year ?? null,
      favorite_memory: row.favorite_memory ?? null,
      badges: row.badges ?? [],
      vibe_rating: row.vibe_rating ?? null,
      honorable_mention: Boolean(row.honorable_mention),
      cities_visited: row.cities_visited ?? [],
      parks_visited: row.parks_visited ?? [],
      created_at: parseDate(row.created_at),
      updated_at: parseDate(row.updated_at),
    })
  })

  await batch.commit()
  return rows.length
}

async function importParks(db, path) {
  if (!path) return 0
  const rows = await readJsonArray(path)
  const batch = db.batch()

  rows.forEach((row) => {
    if (!row?.park_name) throw new Error('Every park ranking row must include park_name.')
    const collection = db.collection('parkRankings')
    const docRef = row.id ? collection.doc(row.id) : collection.doc()
    batch.set(docRef, {
      facilities: row.facilities,
      honorable_mention: Boolean(row.honorable_mention),
      is_custom: Boolean(row.is_custom),
      notes: row.notes ?? '',
      park_code: row.park_code ?? null,
      park_name: row.park_name,
      roads: row.roads,
      scenery: row.scenery,
      trails: row.trails,
      visited_date: row.visited_date ?? null,
      visitor_center: row.visitor_center,
      created_at: parseDate(row.created_at),
      updated_at: parseDate(row.updated_at),
    })
  })

  await batch.commit()
  return rows.length
}

const statesPath = getArg('states')
const parksPath = getArg('parks')

if (!statesPath && !parksPath) {
  console.error('Usage: npm --prefix functions run import:backup -- --states=./state_travel_entries.json --parks=./park_rankings.json')
  process.exit(1)
}

await initializeAdmin()
const db = getFirestore()

const stateCount = await importStates(db, statesPath)
const parkCount = await importParks(db, parksPath)

console.log(`Imported ${stateCount} state entries and ${parkCount} park rankings into Firestore.`)
