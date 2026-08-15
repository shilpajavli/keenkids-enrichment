'use client'

import { useState, useEffect, useCallback } from 'react'

interface Member {
  id: string
  email: string
  full_name: string
  role: 'teacher' | 'parent'
  created_at: string
}

export default function TeamManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'teacher' | 'parent'>('teacher')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/invites')
    const { data } = await res.json()
    setMembers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setMessage(null)
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, role }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMessage({ type: 'error', text: json.error ?? 'Failed to send invite' })
    } else {
      setMessage({ type: 'success', text: json.message })
      setEmail(''); setName('')
      await fetchMembers()
    }
    setSending(false)
  }

  const teachers = members.filter(m => m.role === 'teacher')
  const parents = members.filter(m => m.role === 'parent')

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Invite form */}
      <div className="card p-6">
        <h2 className="font-serif text-lg font-light mb-4" style={{ color: '#1A1814' }}>Send Invite</h2>
        <form onSubmit={sendInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8A8580' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8A8580' }}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'teacher' | 'parent')}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814' }}>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#8A8580' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@email.com"
              required
              className="w-full text-sm rounded-lg px-3 py-2 outline-none"
              style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814' }}
            />
          </div>
          {message && (
            <div className="text-sm rounded-lg px-3 py-2"
              style={{
                background: message.type === 'success' ? '#E8F5E9' : '#FDECEA',
                color: message.type === 'success' ? '#2E7D32' : '#791F1F',
              }}>
              {message.text}
            </div>
          )}
          <button type="submit" disabled={sending || !email}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#1A1814', color: '#B8973A' }}>
            {sending ? 'Sending…' : '✉️ Send Magic Link'}
          </button>
        </form>
      </div>

      {/* Teachers list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
          <h2 className="font-medium text-sm" style={{ color: '#1A1814' }}>Teachers ({teachers.length})</h2>
        </div>
        {loading ? (
          <div className="px-5 py-6 text-sm" style={{ color: '#8A8580' }}>Loading…</div>
        ) : teachers.length === 0 ? (
          <div className="px-5 py-6 text-sm" style={{ color: '#8A8580' }}>No teachers yet — invite one above.</div>
        ) : (
          teachers.map((m, i) => (
            <div key={m.id} className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: i < teachers.length - 1 ? '1px solid rgba(184,151,58,0.08)' : 'none' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: '#1A1814' }}>{m.full_name || '—'}</div>
                <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>{m.email}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#EFE6CC', color: '#8A6E25' }}>Teacher</span>
            </div>
          ))
        )}
      </div>

      {/* Parents list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
          <h2 className="font-medium text-sm" style={{ color: '#1A1814' }}>Parents ({parents.length})</h2>
        </div>
        {loading ? (
          <div className="px-5 py-6 text-sm" style={{ color: '#8A8580' }}>Loading…</div>
        ) : parents.length === 0 ? (
          <div className="px-5 py-6 text-sm" style={{ color: '#8A8580' }}>No parents yet — invite one above.</div>
        ) : (
          parents.map((m, i) => (
            <div key={m.id} className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: i < parents.length - 1 ? '1px solid rgba(184,151,58,0.08)' : 'none' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: '#1A1814' }}>{m.full_name || '—'}</div>
                <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>{m.email}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#DCF0FF', color: '#006FFF' }}>Parent</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
