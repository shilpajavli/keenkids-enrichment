'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

const CONFLICT_TYPES = ['Off Day', 'Sick Leave', 'Personal', 'Other']

interface Leave {
  id: string
  date: string
  conflict_type: string | null
  hours_affected: string | null
  notes: string | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TeacherLeaveForm({ teacherName, initial }: { teacherName: string; initial: Leave[] }) {
  const [leaves, setLeaves] = useState(initial)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [conflictType, setConflictType] = useState('')
  const [hours, setHours] = useState('2:30-5:30 pm')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = leaves.filter(l => l.date >= today).sort((a, b) => a.date.localeCompare(b.date))

  async function submit() {
    if (!date) return
    setSaving(true)
    const res = await fetch('/api/teacher-absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher_name: teacherName,
        date,
        conflict_type: conflictType || null,
        hours_affected: hours || null,
        notes: notes || null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.data) {
      setLeaves(prev => [...prev, json.data])
      setDate(''); setConflictType(''); setHours('2:30-5:30 pm'); setNotes('')
      setOpen(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    }
  }

  return (
    <Card>
      <CardHeader title="My Upcoming Leaves" action={
        <button className="text-[11px]" style={{ color: '#B8973A' }} onClick={() => setOpen(v => !v)}>
          {open ? 'Cancel' : '+ Notify admin'}
        </button>
      } />
      <CardBody className="space-y-3">
        {saved && (
          <div className="rounded-lg px-4 py-2 text-[12.5px]" style={{ background: '#F0F7EC', color: '#27500A' }}>
            ✓ Leave submitted — admin has been notified
          </div>
        )}

        {/* Add form */}
        {open && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#FAF7F2', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Date</label>
                <input type="date" className="input text-[13px]" min={today} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Type</label>
                <select className="input text-[13px]" value={conflictType} onChange={e => setConflictType(e.target.value)}>
                  <option value="">Select type…</option>
                  {CONFLICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Hours affected</label>
              <input className="input text-[13px]" placeholder="e.g. 2:30-5:30 pm" value={hours} onChange={e => setHours(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Notes (optional)</label>
              <input className="input text-[13px]" placeholder="Any details for the admin…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-gold text-[12px]" onClick={submit} disabled={saving || !date}>
              {saving ? 'Submitting…' : 'Submit leave'}
            </button>
          </div>
        )}

        {/* Upcoming leaves */}
        {upcoming.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#8A8580' }}>No upcoming leaves — use the button above to notify admin of any planned absences.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(l => (
              <div key={l.id} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.15)' }}>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{formatDate(l.date)}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                    {l.conflict_type ?? 'Leave'}
                    {l.hours_affected && <span> · {l.hours_affected}</span>}
                    {l.notes && <span> · {l.notes}</span>}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#FFF8E7', color: '#8A6E25' }}>Submitted</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
