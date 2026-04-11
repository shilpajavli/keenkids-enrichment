'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(184,151,58,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[rgba(184,151,58,0.4)] mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="#B8973A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-4xl font-light text-ink">
            <em>KeenKids</em> Enrichment
          </h1>
          <p className="text-ink-tertiary text-sm mt-2 tracking-wide">Enrichment Program Portal</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-gold-light flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8973A" strokeWidth="2">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                  <path d="M22 6l-10 7L2 6"/>
                </svg>
              </div>
              <h2 className="font-serif text-xl font-light text-ink mb-2">Check your email</h2>
              <p className="text-ink-tertiary text-sm leading-relaxed">
                We sent a magic link to <strong className="text-ink">{email}</strong>.<br/>
                Click it to sign in — no password needed.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-light text-ink mb-1">Welcome</h2>
              <p className="text-ink-tertiary text-sm mb-6">Sign in to continue</p>

              {/* Google login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border mb-4 transition-colors hover:bg-gray-50"
                style={{ borderColor: 'rgba(184,151,58,0.32)', background: 'white' }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-[13px] font-medium" style={{ color: '#1A1814' }}>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(184,151,58,0.22)' }} />
                <span className="text-[11px]" style={{ color: '#8A8580' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(184,151,58,0.22)' }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-ink-tertiary mb-1.5 tracking-wide">
                    Email address
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-[#791F1F] text-xs bg-[#FCEBEB] px-3 py-2 rounded-lg">{error}</p>
                )}

                <button type="submit" className="btn btn-gold w-full justify-center py-2.5" disabled={loading}>
                  {loading ? 'Sending link…' : 'Send magic link'}
                </button>
              </form>

              <p className="text-center text-xs text-ink-tertiary mt-5">
                No account? Contact your program administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
