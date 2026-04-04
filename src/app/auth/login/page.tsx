'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(184,151,58,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[rgba(184,151,58,0.4)] mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="#B8973A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-serif text-4xl font-light text-ink">
            <em>Luminary</em> Scholars
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
              <h2 className="font-serif text-2xl font-light text-ink mb-1">Welcome back</h2>
              <p className="text-ink-tertiary text-sm mb-6">Sign in with your email to continue</p>

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
