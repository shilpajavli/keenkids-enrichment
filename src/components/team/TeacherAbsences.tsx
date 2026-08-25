'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

interface Absence {
  id: string
  teacher_name: string
  date: string
  conflict_type: string | null
  hours_affected: string | null
  notes: string | null
}

const CONFLICT_TYPES = ['Off Day', 'Sick Leave', 'Personal', 'Other']
const TEACHERS = ['Varya Karpelevitch', 'Pheobe Navarro', 'Lizi Lin']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function groupByMonth(absences: Absence[]) {
  const groups: Record<string, Absence[]> = {}
  for (const a of absences) {
    const d = new Date(a.date + 'T00:00:00')
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  return groups
}

export default function TeacherAbsences({ initial }: { initial: Absence[] }) {
  const [absences, setAbsences] = useState(initial)
  const [collapsed, setCollapsed] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [teacher, setTeacher] = useState('')
  const [date, setDate] = useState('')
  const [conflictType, setConflictType] = useState('')
  const [hours, setHours] = useState('2:30-5:30 pm')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = absences.filter(a => a.date >= today)
  const past = absences.filter(a => a.date < today)
  const grouped = groupByMonth(upcoming)

  async function add() {
    if (!teacher || !date) return
    setSaving(true)
    const res = await fetch('/api/teacher-absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_name: teacher, date, conflict_type: conflictType || null, hours_affected: hours || null, notes: notes || null }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.data) {
      setAbsences(prev => [...prev, json.data].sort((a, b) => a.date.localeCompare(b.date)))
      setShowForm(false)
      setTeacher(''); setDate(''); setConflictType(''); setHours('2:30-5:30 pm'); setNotes('')
    }
  }

  async function remove(id: string) {
    await fetch(`/api/teacher-absences?id=${id}`, { method: 'DELETE' })
    setAbsences(prev => prev.filter(a => a.id !== id))
  }

  const typeColor = (t: string | null) => {
    if (t === 'Off Day') return { bg: '#FFF8E7', color: '#8A6E25' }
    if (t === 'Sick Leave') return { bg: '#FDF2F2', color: '#791F1F' }
    if (t === 'Personal') return { bg: '#F0F7EC', color: '#27500A' }
    return { bg: '#F5F0E8', color: '#8A8580' }
  }

  return (
    <Card>
      <CardHeader title={
        <button className="flex items-center gap-2" onClick={() => setCollapsed(v => !v)}>
          <span>Teacher Absences</span>
          <span className="text-[11px]" style={{ color: '#8A8580' }}>{collapsed ? '▸' : '▾'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#8A6E25' }}>{upcoming.length} upcoming</span>
        </button> as any
      } action={
        !collapsed && <button className="text-[11px]" style={{ color: '#B8973A' }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Add absence'}
        </button>
      } />
      {!collapsed && <CardBody className="space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#FAF7F2', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Teacher</label>
                <select className="input text-[13px]" value={teacher} onChange={e => setTeacher(e.target.value)}>
                  <option value="">Select teacher…</option>
                  {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__other">Other…</option>
                </select>
                {teacher === '__other' && (
                  <input className="input text-[13px] mt-2" placeholder="Enter name" onChange={e => setTeacher(e.target.value)} />
                )}
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Date</label>
                <input type="date" className="input text-[13px]" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Type</label>
                <select className="input text-[13px]" value={conflictType} onChange={e => setConflictType(e.target.value)}>
                  <option value="">Select type…</option>
                  {CONFLICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Hours affected</label>
                <input className="input text-[13px]" placeholder="e.g. 2:30-5:30 pm" value={hours} onChange={e => setHours(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Notes (optional)</label>
              <input className="input text-[13px]" placeholder="Any additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-gold text-[12px]" onClick={add} disabled={saving || !teacher || !date}>
              {saving ? 'Saving…' : 'Save absence'}
            </button>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#8A8580' }}>No upcoming absences</p>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: '#8A8580' }}>{month}</div>
              <div className="space-y-2">
                {items.map(a => {
                  const { bg, color } = typeColor(a.conflict_type)
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.15)' }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{a.teacher_name}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                            {formatDate(a.date)}
                            {a.hours_affected && <span> · {a.hours_affected}</span>}
                            {a.notes && <span> · {a.notes}</span>}
                          </div>
                        </div>
                        {a.conflict_type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: bg, color }}>{a.conflict_type}</span>
                        )}
                      </div>
                      <button onClick={() => remove(a.id)} className="ml-3 flex-shrink-0" style={{ color: '#8A8580' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Past absences (collapsed) */}
        {past.length > 0 && (
          <details className="mt-2">
            <summary className="text-[12px] cursor-pointer" style={{ color: '#8A8580' }}>
              {past.length} past absence{past.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2">
              {past.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#F5F0E8', opacity: 0.6 }}>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: '#1A1814' }}>{a.teacher_name}</div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>{formatDate(a.date)}{a.conflict_type ? ` · ${a.conflict_type}` : ''}</div>
                  </div>
                  <button onClick={() => remove(a.id)} style={{ color: '#8A8580' }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardBody>}
    </Card>
  )
}
