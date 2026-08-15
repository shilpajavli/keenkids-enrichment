'use client'

import { useState, useEffect, useCallback } from 'react'

interface TimeEntry {
  id: string
  clock_in: string
  clock_out: string | null
  hours: number | null
  notes: string | null
  status: string
}

export default function ClockInOut() {
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [notes, setNotes] = useState('')
  const [elapsed, setElapsed] = useState('')
  const [error, setError] = useState('')

  const fetchToday = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/timesheets')
    const { data } = await res.json()
    const today = new Date().toISOString().slice(0, 10)
    const todayEntry = (data ?? []).find((e: any) => e.date === today) ?? null
    setEntry(todayEntry)
    setLoading(false)
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  // Live elapsed timer while clocked in
  useEffect(() => {
    if (!entry || entry.clock_out) return
    const tick = () => {
      const ms = Date.now() - new Date(entry.clock_in).getTime()
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setElapsed(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry])

  async function handleClockIn() {
    setWorking(true); setError('')
    const res = await fetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); setWorking(false); return }
    setNotes('')
    await fetchToday()
    setWorking(false)
  }

  async function handleClockOut() {
    if (!entry) return
    setWorking(true); setError('')
    const res = await fetch('/api/timesheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, action: 'clock_out', notes: notes || entry.notes }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); setWorking(false); return }
    setNotes('')
    await fetchToday()
    setWorking(false)
  }

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const isClockedIn = entry && !entry.clock_out

  if (loading) return <div className="card p-6 text-center text-sm" style={{ color: '#8A8580' }}>Loading…</div>

  return (
    <div className="card p-6 space-y-4 max-w-sm">
      <div>
        <h2 className="font-serif text-xl font-light" style={{ color: '#1A1814' }}>Today's Shift</h2>
        <p className="text-xs mt-0.5" style={{ color: '#8A8580' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Status */}
      {!entry && (
        <div className="rounded-xl p-4 text-center" style={{ background: '#F5F0E8' }}>
          <div className="text-3xl mb-1">⏱</div>
          <div className="text-sm font-medium" style={{ color: '#4A4640' }}>Not clocked in yet</div>
        </div>
      )}

      {isClockedIn && (
        <div className="rounded-xl p-4 text-center" style={{ background: '#E8F5E9' }}>
          <div className="text-3xl mb-1">🟢</div>
          <div className="text-sm font-semibold" style={{ color: '#2E7D32' }}>Clocked in at {fmt(entry.clock_in)}</div>
          <div className="text-xl font-mono mt-1" style={{ color: '#1B5E20' }}>{elapsed}</div>
          <div className="text-xs mt-1" style={{ color: '#4CAF50' }}>Max 3 hours per day</div>
        </div>
      )}

      {entry && entry.clock_out && (
        <div className="rounded-xl p-4" style={{ background: '#EFE6CC', border: '1.5px solid #B8973A' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: '#8A6E25' }}>✅ Shift complete</div>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#4A4640' }}>
            <div><span style={{ color: '#8A8580' }}>Clock in</span><br /><strong>{fmt(entry.clock_in)}</strong></div>
            <div><span style={{ color: '#8A8580' }}>Clock out</span><br /><strong>{fmt(entry.clock_out)}</strong></div>
            <div><span style={{ color: '#8A8580' }}>Hours</span><br /><strong>{entry.hours}h</strong></div>
            <div><span style={{ color: '#8A8580' }}>Status</span><br />
              <span className="capitalize" style={{ color: entry.status === 'approved' ? '#2E7D32' : '#8A6E25' }}>
                {entry.status}
              </span>
            </div>
          </div>
          {entry.notes && <div className="text-xs mt-2" style={{ color: '#8A8580' }}>Note: {entry.notes}</div>}
        </div>
      )}

      {/* Notes input */}
      {!entry?.clock_out && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#8A8580' }}>
            Notes <span style={{ color: '#B8B4B0' }}>(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Covered for Jane today…"
            className="w-full text-sm rounded-lg px-3 py-2 resize-none outline-none"
            style={{ border: '1.5px solid rgba(184,151,58,0.3)', background: '#FDFCF9', color: '#1A1814' }}
          />
        </div>
      )}

      {error && <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#FDECEA', color: '#791F1F' }}>{error}</div>}

      {/* Action button */}
      {!entry && (
        <button
          onClick={handleClockIn}
          disabled={working}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity"
          style={{ background: '#2E7D32', color: '#fff', opacity: working ? 0.6 : 1 }}>
          {working ? 'Clocking in…' : '🟢 Clock In'}
        </button>
      )}

      {isClockedIn && (
        <button
          onClick={handleClockOut}
          disabled={working}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity"
          style={{ background: '#791F1F', color: '#fff', opacity: working ? 0.6 : 1 }}>
          {working ? 'Clocking out…' : '🔴 Clock Out'}
        </button>
      )}
    </div>
  )
}
