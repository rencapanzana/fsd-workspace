import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="grid min-h-dvh place-items-center bg-rail px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-on-rail">
          <h1 className="display text-xl">FSD WorkSpace</h1>
          <p className="mt-1 text-on-rail-mid">Francis Street Digital. Team sign-in.</p>
        </div>
        <form className="panel space-y-4 border-t-8 border-t-canary p-5"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
            setBusy(false)
            if (error) setError(error.status === 400 ? "That email and password don't match." : "Couldn't reach the server. Check your connection and try again.")
          }}>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="font-semibold text-red">{error}</p>}
          <button className="btn btn-ink w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="meta">Forgot your password? Ask Jeremy to reset it.</p>
        </form>
      </div>
    </main>
  )
}
