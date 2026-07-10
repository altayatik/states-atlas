import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.appId
    && firebaseConfig.projectId,
)

let app
let auth
let db

export function getFirebaseApp() {
  if (!isFirebaseConfigured) return null
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseDb() {
  if (!isFirebaseConfigured) return null
  if (!db) db = getFirestore(getFirebaseApp())
  return db
}

export function getFirebaseAuth() {
  if (!isFirebaseConfigured) return null
  if (!auth) auth = getAuth(getFirebaseApp())
  return auth
}
