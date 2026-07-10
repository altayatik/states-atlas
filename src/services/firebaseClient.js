import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

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
let db
let functions

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

export function getFirebaseFunctions() {
  if (!isFirebaseConfigured) return null
  if (!functions) {
    functions = getFunctions(
      getFirebaseApp(),
      import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1',
    )
  }
  return functions
}
