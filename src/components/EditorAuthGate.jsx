import { LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { ATLAS_ADMIN_EMAILS } from '../services/editorAuth'

export function EditorAuthGate({ error, isSigningIn, onBack, onSignIn, onSignOut, user }) {
  const isWrongAccount = Boolean(user && !ATLAS_ADMIN_EMAILS.includes(user.email))

  return (
    <main className="editor-gate">
      <section className="gate-card glass-panel" aria-labelledby="editor-gate-title">
        <p className="eyebrow">
          <ShieldCheck size={17} aria-hidden="true" />
          Private edit access
        </p>
        <h1 id="editor-gate-title">Travel Atlas Editor</h1>
        <p>Sign in with Google to update state memories and National Parks rankings.</p>

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
              <LogIn size={18} aria-hidden="true" />
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
