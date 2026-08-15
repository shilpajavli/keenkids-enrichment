'use client'

import { useState, useEffect, useCallback } from 'react'

interface Entry {
  id: string
  date: string
  clock_in: string
  clock_out: string | null
  hours: number | null
  notes: string | null
  status: string
  hourly_rate: number | null
  teacher: { id: string; full_name: string; email: string }
  school: { name: string } | null
}

function getWeekStart(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7) // Monday
  return d.toISOString().slice(0, 10)
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TimesheetAdmin() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [working, setWorking] = useState<string | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [editRate, setEditRate] = useState<{ teacherId: string; value: string } | null>(null)
  const [savingRate, setSavingRate] = useState(false)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/timesheets?week_start=${weekStart}`)
    const { data } = await res.json()
    setEntries(data ?? [])

    // Build rates map
    const r: Record<string, number> = {}
    ;(data ?? []).forEach((e: Entry) => {
      if (e.hourly_rate) r[e.teacher.id] = e.hourly_rate
    })
    setRates(r)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setWorking(id)
    await fetch('/api/timesheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'update_status', status }),
    })
    await fetchEntries()
    setWorking(null)
  }

  async function saveRate(teacherId: string, rate: string) {
    setSavingRate(true)
    await fetch('/api/teacher-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id: teacherId, hourly_rate: parseFloat(rate) }),
    })
    setRates(r => ({ ...r, [teacherId]: parseFloat(rate) }))
    setEditRate(null)
    setSavingRate(false)
    await fetchEntries()
  }

  // Group by teacher
  const byTeacher = entries.reduce((acc: Record<string, { name: string; entries: Entry[] }>, e) => {
    const tid = e.teacher.id
    if (!acc[tid]) acc[tid] = { name: e.teacher.full_name, entries: [] }
    acc[tid].entries.push(e)
    return acc
  }, {})

  const totalApprovedHours = entries.filter(e => e.status === 'approved').reduce((s, e) => s + (e.hours ?? 0), 0)
  const totalPay = entries.filter(e => e.status === 'approved').reduce((s, e) => s + (e.hours ?? 0) * (e.hourly_rate ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Week nav + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'rgba(184,151,58,0.3)', color: '#8A6E25' }}>← Prev</button>
          <span className="text-sm font-medium px-3" style={{ color: '#1A1814' }}>
            {fmtDate(weekStart)} – {fmtDate(weekEnd.toISOString().slice(0, 10))}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            className="px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-30"
            style={{ borderColor: 'rgba(184,151,58,0.3)', color: '#8A6E25' }}>Next →</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: '#EFE6CC', color: '#8A6E25' }}>This week</button>
          )}
        </div>
        <a href={`/api/timesheets/export?week_start=${weekStart}`}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: '#1A1814', color: '#B8973A' }}>
          ↓ Export CSV
        </a>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="font-serif text-2xl font-light" style={{ color: '#8A6E25' }}>{entries.length}</div>
          <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>Total entries</div>
        </div>
        <div className="card p-4">
          <div className="font-serif text-2xl font-light" style={{ color: '#27500A' }}>{totalApprovedHours.toFixed(1)}h</div>
          <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>Approved hours</div>
        </div>
        <div className="card p-4">
          <div className="font-serif text-2xl font-light" style={{ color: '#791F1F' }}>
            {totalPay > 0 ? `$${totalPay.toFixed(2)}` : '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>Total pay (approved)</div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm" style={{ color: '#8A8580' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-sm" style={{ color: '#8A8580' }}>No entries for this week.</div>
      ) : (
        Object.entries(byTeacher).map(([tid, { name, entries: tEntries }]) => {
          const totalHours = tEntries.reduce((s, e) => s + (e.hours ?? 0), 0)
          const rate = rates[tid]
          const totalEarned = rate ? totalHours * rate : null

          return (
            <div key={tid} className="card overflow-hidden">
              {/* Teacher header */}
              <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
                style={{ background: '#FAF7F2', borderBottom: '1px solid rgba(184,151,58,0.14)' }}>
                <div>
                  <div className="font-medium text-sm" style={{ color: '#1A1814' }}>{name}</div>
                  <div className="text-xs" style={{ color: '#8A8580' }}>
                    {totalHours.toFixed(1)}h this week
                    {totalEarned != null && ` · $${totalEarned.toFixed(2)}`}
                  </div>
                </div>
                {/* Hourly rate editor */}
                <div className="flex items-center gap-2">
                  {editRate?.teacherId === tid ? (
                    <>
                      <span className="text-xs" style={{ color: '#8A8580' }}>$/hr</span>
                      <input
                        type="number"
                        value={editRate.value}
                        onChange={e => setEditRate({ teacherId: tid, value: e.target.value })}
                        className="w-20 text-sm rounded-lg px-2 py-1 outline-none"
                        style={{ border: '1.5px solid rgba(184,151,58,0.4)', color: '#1A1814' }}
                      />
                      <button onClick={() => saveRate(tid, editRate.value)} disabled={savingRate}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: '#1A1814', color: '#B8973A' }}>
                        {savingRate ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditRate(null)} className="text-xs" style={{ color: '#8A8580' }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setEditRate({ teacherId: tid, value: rate?.toString() ?? '' })}
                      className="text-xs px-3 py-1 rounded-lg border"
                      style={{ borderColor: 'rgba(184,151,58,0.3)', color: '#8A6E25' }}>
                      {rate ? `$${rate}/hr` : 'Set rate'}
                    </button>
                  )}
                </div>
              </div>

              {/* Entries */}
              {tEntries.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
                  style={{ borderBottom: '1px solid rgba(184,151,58,0.08)' }}>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs font-medium" style={{ color: '#1A1814' }}>{fmtDate(e.date)}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#8A8580' }}>
                        {e.clock_out
                          ? `${fmt(e.clock_in)} → ${fmt(e.clock_out)} · ${e.hours}h`
                          : `Clocked in at ${fmt(e.clock_in)} · still active`}
                      </div>
                      {e.notes && <div className="text-xs mt-0.5 italic" style={{ color: '#B8B4B0' }}>{e.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.status === 'pending' && e.clock_out && (
                      <>
                        <button onClick={() => updateStatus(e.id, 'approved')} disabled={working === e.id}
                          className="text-xs px-3 py-1 rounded-lg font-medium"
                          style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                          {working === e.id ? '…' : '✓ Approve'}
                        </button>
                        <button onClick={() => updateStatus(e.id, 'rejected')} disabled={working === e.id}
                          className="text-xs px-3 py-1 rounded-lg"
                          style={{ background: '#FDECEA', color: '#791F1F' }}>
                          Reject
                        </button>
                      </>
                    )}
                    {e.status === 'approved' && (
                      <span className="text-xs px-3 py-1 rounded-lg" style={{ background: '#E8F5E9', color: '#2E7D32' }}>✓ Approved</span>
                    )}
                    {e.status === 'rejected' && (
                      <span className="text-xs px-3 py-1 rounded-lg" style={{ background: '#FDECEA', color: '#791F1F' }}>Rejected</span>
                    )}
                    {e.status === 'pending' && !e.clock_out && (
                      <span className="text-xs px-3 py-1 rounded-lg" style={{ background: '#FFF8E1', color: '#F57F17' }}>In progress</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
