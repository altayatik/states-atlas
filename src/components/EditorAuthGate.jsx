import { LogOut } from 'lucide-react'
import { ATLAS_ADMIN_EMAIL } from '../services/editorAuth'

export function EditorAuthGate({ error, isSigningIn, onBack, onSignIn, onSignOut, user }) {
  const isWrongAccount = Boolean(user && user.email !== ATLAS_ADMIN_EMAIL)

  return (
    <main className="editor-gate">
      <section className="gate-card" aria-labelledby="editor-gate-title">
        <p className="eyebrow">Private edit access</p>
        <h1 id="editor-gate-title">Road Atlas Editor</h1>
        <p>Only the atlas owner can edit trip memories and park rankings.</p>

        {user && (
          <div className="signed-in-card">
            <span>Signed in as</span>
            <strong>{user.email}</strong>
          </div>
        )}

        {isWrongAccount && (
          <p className="form-error" role="alert">
            This account is not allowed to edit this atlas.
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="gate-actions">
          {!user ? (
            <button className="button" type="button" onClick={onSignIn} disabled={isSigningIn}>
              {isSigningIn ? 'Signing in...' : 'Sign in with Google to edit'}
            </button>
          ) : (
            <button className="button" type="button" onClick={onSignOut}>
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          )}
          <button className="button button--secondary" type="button" onClick={onBack}>
            Back to public atlas
          </button>
        </div>
      </section>
    </main>
  )
}
