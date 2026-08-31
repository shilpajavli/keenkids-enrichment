'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ParentSignOutButton({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    if (!confirm('Sign out your child now?')) return
    setLoading(true)
    await fetch('/api/sign-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, event_type: 'sign_out' }),
    })
    setDone(true)
    setLoading(false)
    router.refresh()
  }

  if (done) return (
    <span className="text-[12px] px-3 py-1.5 rounded-full font-medium" style={{ background: '#F0FAF4', color: '#27500A' }}>
      ✓ Signed out
    </span>
  )

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-[12px] px-4 py-1.5 rounded-full font-medium transition-all"
      style={{ background: '#1A1814', color: '#B8973A', opacity: loading ? 0.6 : 1 }}>
      {loading ? 'Signing out…' : 'Sign out my child'}
    </button>
  )
}
