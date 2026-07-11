import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from './firebaseClient'

export const ATLAS_ADMIN_EMAIL = 'altayatik01@gmail.com'
export const ATLAS_ADMIN_EMAILS = [
  ATLAS_ADMIN_EMAIL,
  'aidima821@gmail.com',
]

export function isAtlasAdmin(user) {
  return Boolean(
    user
      && ATLAS_ADMIN_EMAILS.includes(user.email)
      && user.emailVerified,
  )
}

export function subscribeEditorAuth(callback) {
  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export async function signInToEditor() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured for editor sign-in.')
  }

  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOutOfEditor() {
  const auth = getFirebaseAuth()
  if (auth) await signOut(auth)
}
