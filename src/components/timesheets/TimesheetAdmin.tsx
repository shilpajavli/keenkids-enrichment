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
  const [editHours, setEditHours] = useState<{ id: string; clockIn: string; clockOut: string } | null>(null)
  const [savingHours, setSavingHours] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const [timesRes, ratesRes] = await Promise.all([
      fetch(`/api/timesheets?week_start=${weekStart}`).then(r => r.json()),
      fetch('/api/teacher-rates').then(r => r.json()),
    ])
    setEntries(timesRes.data ?? [])
    // Build rates map from the dedicated rates table
    const r: Record<string, number> = {}
    ;(ratesRes.data ?? []).forEach((row: any) => {
      if (row.hourly_rate) r[row.teacher_id] = row.hourly_rate
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

  async function saveHours() {
    if (!editHours) return
    setSavingHours(true)
    // editHours.clockIn/clockOut are "HH:MM" — combine with the entry's date
    const entry = entries.find(e => e.id === editHours.id)
    if (!entry) { setSavingHours(false); return }
    const clockIn = new Date(`${entry.date}T${editHours.clockIn}:00`).toISOString()
    const clockOut = new Date(`${entry.date}T${editHours.clockOut}:00`).toISOString()
    await fetch('/api/timesheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editHours.id, action: 'edit_hours', clock_in: clockIn, clock_out: clockOut }),
    })
    setEditHours(null)
    setSavingHours(false)
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

  const pendingCount = entries.filter(e => e.status === 'pending' && e.clock_out).length

  return (
    <div className="space-y-5">
      {/* Week nav + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors hover:opacity-70"
            style={{ border: '1px solid rgba(184,151,58,0.3)', color: '#8A6E25' }}>←</button>
          <span className="text-sm font-medium px-3 tabular-nums" style={{ color: '#1A1814', minWidth: 200, textAlign: 'center' }}>
            {fmtDate(weekStart)} – {fmtDate(weekEnd.toISOString().slice(0, 10))}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors hover:opacity-70 disabled:opacity-30"
            style={{ border: '1px solid rgba(184,151,58,0.3)', color: '#8A6E25' }}>→</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              className="ml-1 px-3 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
              style={{ background: '#EFE6CC', color: '#8A6E25' }}>Today</button>
          )}
        </div>
        <a href={`/api/timesheets/export?week_start=${weekStart}`}
          className="px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-opacity hover:opacity-80"
          style={{ background: '#1A1814', color: '#B8973A', letterSpacing: '0.04em' }}>
          ↓ Export CSV
        </a>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(184,151,58,0.18)' }}>
        <div className="grid grid-cols-4">
          {[
            { label: 'Entries', value: entries.length.toString(), color: '#8A6E25' },
            { label: 'Needs approval', value: pendingCount.toString(), color: pendingCount > 0 ? '#B45309' : '#8A8580' },
            { label: 'Approved hrs', value: `${totalApprovedHours.toFixed(1)}h`, color: '#27500A' },
            { label: 'Total pay', value: totalPay > 0 ? `$${totalPay.toFixed(2)}` : '—', color: '#1A1814' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="px-5 py-4" style={{ background: '#FAF7F2', borderRight: i < 3 ? '1px solid rgba(184,151,58,0.15)' : 'none' }}>
              <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>{label}</div>
              <div className="font-serif text-2xl font-light tabular-nums" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-sm" style={{ color: '#8A8580' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: '#8A8580' }}>No entries for this week.</div>
      ) : (
        Object.entries(byTeacher).map(([tid, { name, entries: tEntries }]) => {
          const totalHours = tEntries.reduce((s, e) => s + (e.hours ?? 0), 0)
          const rate = rates[tid]
          const totalEarned = rate ? totalHours * rate : null
          const hasPending = tEntries.some(e => e.status === 'pending' && e.clock_out)
          const isCollapsed = collapsed.has(tid)
          const toggleCollapse = () => setCollapsed(prev => {
            const next = new Set(prev)
            next.has(tid) ? next.delete(tid) : next.add(tid)
            return next
          })

          return (
            <div key={tid} className="card overflow-hidden">
              {/* Teacher header */}
              <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
                style={{ background: '#FAF7F2', borderBottom: isCollapsed ? 'none' : '1px solid rgba(184,151,58,0.14)' }}>
                {/* Left: avatar + name — click to collapse */}
                <button onClick={toggleCollapse} className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: '#1A1814', color: '#B8973A' }}>
                    {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2" style={{ color: '#1A1814' }}>
                      {name}
                      {hasPending && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#B45309' }}>Needs review</span>}
                      <span className="text-[11px]" style={{ color: '#8A8580' }}>{isCollapsed ? '▸' : '▾'}</span>
                    </div>
                    <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: '#8A8580' }}>
                      {totalHours.toFixed(1)} hrs this week
                      {totalEarned != null && <span style={{ color: '#27500A' }}> · ${totalEarned.toFixed(2)} earned</span>}
                    </div>
                  </div>
                </button>
                {/* Right: hourly rate editor */}
                <div className="flex items-center gap-2">
                  {editRate?.teacherId === tid ? (
                    <>
                      <span className="text-[11px]" style={{ color: '#8A8580' }}>$/hr</span>
                      <input type="number" value={editRate.value}
                        onChange={e => setEditRate({ teacherId: tid, value: e.target.value })}
                        className="text-sm rounded-lg px-2 py-1.5 outline-none tabular-nums"
                        style={{ border: '1.5px solid rgba(184,151,58,0.4)', color: '#1A1814', width: 72 }} />
                      <button onClick={() => saveRate(tid, editRate.value)} disabled={savingRate}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: '#1A1814', color: '#B8973A' }}>
                        {savingRate ? '…' : 'Save'}
                      </button>
                      <button onClick={() => setEditRate(null)} className="text-xs" style={{ color: '#8A8580' }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setEditRate({ teacherId: tid, value: rate?.toString() ?? '' })}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                      style={{ borderColor: 'rgba(184,151,58,0.3)', color: '#8A6E25' }}>
                      {rate ? `$${rate}/hr` : 'Set rate'}
                    </button>
                  )}
                </div>
              </div>

              {/* Column headers + entries — hidden when collapsed */}
              {!isCollapsed && <>
              {/* Column headers */}
              <div className="grid px-5 py-2 text-[10px] font-medium tracking-[0.08em] uppercase"
                style={{ color: '#8A8580', gridTemplateColumns: '130px 1fr 1fr 60px 90px 1fr', background: '#FDFCF9', borderBottom: '1px solid rgba(184,151,58,0.1)' }}>
                <span>Date</span>
                <span>Clock in</span>
                <span>Clock out</span>
                <span>Hrs</span>
                <span>Status</span>
                <span></span>
              </div>

              {/* Entry rows */}
              {tEntries.map(e => {
                const isEditing = editHours?.id === e.id
                const toTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

                const statusEl = e.status === 'approved'
                  ? <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#DCFCE7', color: '#166534' }}>Approved</span>
                  : e.status === 'rejected'
                  ? <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>Rejected</span>
                  : !e.clock_out
                  ? <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#B45309' }}>Active</span>
                  : <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#6B7280' }}>Pending</span>

                return (
                  <div key={e.id} style={{ borderBottom: '1px solid rgba(184,151,58,0.07)' }}>
                    <div className="grid items-center px-5 py-3 text-[13px]"
                      style={{ gridTemplateColumns: '130px 1fr 1fr 60px 90px 1fr' }}>
                      <span className="font-medium" style={{ color: '#1A1814' }}>{fmtDate(e.date)}</span>
                      <span className="tabular-nums" style={{ color: '#4A4640' }}>{fmt(e.clock_in)}</span>
                      <span className="tabular-nums" style={{ color: e.clock_out ? '#4A4640' : '#8A8580' }}>
                        {e.clock_out ? fmt(e.clock_out) : '—'}
                      </span>
                      <span className="tabular-nums font-medium" style={{ color: '#1A1814' }}>
                        {e.hours != null ? `${e.hours}h` : '—'}
                      </span>
                      <span>{statusEl}</span>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditHours(isEditing ? null : { id: e.id, clockIn: toTime(e.clock_in), clockOut: e.clock_out ? toTime(e.clock_out) : '' })}
                          className="text-[11px] px-2.5 py-1 rounded-lg border transition-colors"
                          style={{ borderColor: 'rgba(184,151,58,0.3)', color: '#8A6E25' }}>
                          {isEditing ? 'Cancel' : '✎ Edit'}
                        </button>
                        {e.status === 'pending' && e.clock_out && (
                          <>
                            <button onClick={() => updateStatus(e.id, 'approved')} disabled={working === e.id}
                              className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                              style={{ background: '#DCFCE7', color: '#166534' }}>
                              {working === e.id ? '…' : '✓ Approve'}
                            </button>
                            <button onClick={() => updateStatus(e.id, 'rejected')} disabled={working === e.id}
                              className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                              style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Notes */}
                    {e.notes && !isEditing && (
                      <div className="px-5 pb-2 text-[11px] italic" style={{ color: '#8A8580' }}>{e.notes}</div>
                    )}
                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="px-5 py-3 flex items-end gap-4" style={{ background: '#FAF7F2', borderTop: '1px solid rgba(184,151,58,0.1)' }}>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.08em] block mb-1.5" style={{ color: '#8A8580' }}>Clock in</label>
                          <input type="time" value={editHours!.clockIn}
                            onChange={e2 => setEditHours(h => h ? { ...h, clockIn: e2.target.value } : h)}
                            className="text-sm rounded-lg px-3 py-1.5 outline-none tabular-nums"
                            style={{ border: '1.5px solid rgba(184,151,58,0.4)', color: '#1A1814', background: '#fff' }} />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.08em] block mb-1.5" style={{ color: '#8A8580' }}>Clock out</label>
                          <input type="time" value={editHours!.clockOut}
                            onChange={e2 => setEditHours(h => h ? { ...h, clockOut: e2.target.value } : h)}
                            className="text-sm rounded-lg px-3 py-1.5 outline-none tabular-nums"
                            style={{ border: '1.5px solid rgba(184,151,58,0.4)', color: '#1A1814', background: '#fff' }} />
                        </div>
                        <button onClick={saveHours} disabled={savingHours || !editHours?.clockIn || !editHours?.clockOut}
                          className="text-xs px-4 py-1.5 rounded-lg font-medium disabled:opacity-50"
                          style={{ background: '#1A1814', color: '#B8973A' }}>
                          {savingHours ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              </>}
            </div>
          )
        })
      )}
    </div>
  )
}
