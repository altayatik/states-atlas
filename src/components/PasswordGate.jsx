import { useState } from 'react'

export function PasswordGate({ error, onBack, onSubmit }) {
  const [secretPhrase, setSecretPhrase] = useState('')

  return (
    <main className="editor-gate">
      <section className="gate-card" aria-labelledby="editor-gate-title">
        <p className="eyebrow">Private edit access</p>
        <h1 id="editor-gate-title">Road Atlas Editor</h1>
        <form
          className="gate-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(secretPhrase)
          }}
        >
          <label>
            Secret phrase
            <input
              autoComplete="current-password"
              placeholder="Enter our private phrase"
              type="password"
              value={secretPhrase}
              onChange={(event) => setSecretPhrase(event.target.value)}
            />
          </label>
          <p>Only our road crew can edit the atlas.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="gate-actions">
            <button className="button" type="submit">Unlock editor</button>
            <button className="button button--secondary" type="button" onClick={onBack}>
              Back to public atlas
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
