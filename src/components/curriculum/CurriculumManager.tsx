'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { School, Curriculum, CurriculumItem } from '@/types'

interface Props {
  schools: School[]
  initialCurriculum: Curriculum[]
  currentWeek: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function formatWeekLabel(weekOf: string): string {
  const date = new Date(weekOf + 'T00:00:00')
  const endDate = new Date(date)
  endDate.setDate(date.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${date.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`
}

function getWeekOffset(weekOf: string, offset: number): string {
  const date = new Date(weekOf + 'T00:00:00')
  date.setDate(date.getDate() + offset * 7)
  return date.toISOString().slice(0, 10)
}

export default function CurriculumManager({ schools, initialCurriculum, currentWeek }: Props) {
  const [curriculum, setCurriculum] = useState<Curriculum[]>(initialCurriculum)
  const [selectedSchool, setSelectedSchool] = useState<string>(schools[0]?.id ?? '')
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<CurriculumItem[]>([])

  const currentCurriculum = curriculum.find(
    c => c.school_id === selectedSchool && c.week_of === selectedWeek
  )

  function startEditing() {
    if (currentCurriculum) {
      setTitle(currentCurriculum.title)
      setDescription(currentCurriculum.description ?? '')
      setItems(currentCurriculum.content ?? [])
    } else {
      setTitle(`Week of ${formatWeekLabel(selectedWeek)}`)
      setDescription('')
      setItems(DAYS.map(day => ({ day, subject: '', activity: '', materials: '' })))
    }
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setTitle('')
    setDescription('')
    setItems([])
  }

  function updateItem(index: number, field: keyof CurriculumItem, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { day: '', subject: '', activity: '', materials: '' }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function saveCurriculum() {
    if (!selectedSchool || !title.trim()) return
    setSaving(true)

    const payload = {
      school_id: selectedSchool,
      week_of: selectedWeek,
      title: title.trim(),
      description: description.trim() || null,
      content: items.filter(item => item.subject || item.activity),
    }

    if (currentCurriculum) {
      const res = await fetch(`/api/curriculum?id=${currentCurriculum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.data) {
        setCurriculum(prev => prev.map(c => c.id === currentCurriculum.id ? json.data : c))
      }
    } else {
      const res = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.data) {
        setCurriculum(prev => [json.data, ...prev])
      }
    }

    setSaving(false)
    setEditing(false)
  }

  async function deleteCurriculum() {
    if (!currentCurriculum) return
    if (!confirm('Delete this curriculum entry?')) return
    
    await fetch(`/api/curriculum?id=${currentCurriculum.id}`, { method: 'DELETE' })
    setCurriculum(prev => prev.filter(c => c.id !== currentCurriculum.id))
  }

  const schoolName = schools.find(s => s.id === selectedSchool)?.name ?? ''

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* School selector */}
        <div className="flex gap-2">
          {schools.map(school => (
            <button
              key={school.id}
              onClick={() => { setSelectedSchool(school.id); setEditing(false) }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: selectedSchool === school.id ? '#E8E4F8' : '#F5F0E8',
                color: selectedSchool === school.id ? '#5B4B8A' : '#8A8580',
                border: selectedSchool === school.id ? '1.5px solid #8B7FC7' : '1.5px solid transparent',
              }}>
              {school.name}
            </button>
          ))}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => { setSelectedWeek(getWeekOffset(selectedWeek, -1)); setEditing(false) }}
            className="p-2 rounded-lg transition-colors hover:bg-[#F5F0E8]"
            style={{ color: '#8A8580' }}>
            <ChevronLeft size={18} />
          </button>
          <div className="text-[13px] font-medium min-w-[160px] text-center" style={{ color: '#1A1814' }}>
            {formatWeekLabel(selectedWeek)}
          </div>
          <button
            onClick={() => { setSelectedWeek(getWeekOffset(selectedWeek, 1)); setEditing(false) }}
            className="p-2 rounded-lg transition-colors hover:bg-[#F5F0E8]"
            style={{ color: '#8A8580' }}>
            <ChevronRight size={18} />
          </button>
          {selectedWeek !== currentWeek && (
            <button
              onClick={() => { setSelectedWeek(currentWeek); setEditing(false) }}
              className="text-[11px] px-2 py-1 rounded"
              style={{ background: '#EFE6CC', color: '#8A6E25' }}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* Editor or Viewer */}
      {editing ? (
        <Card>
          <CardHeader 
            title={`Edit Curriculum — ${schoolName}`}
            action={
              <div className="flex gap-2">
                <button className="btn text-[12px]" onClick={cancelEditing}>Cancel</button>
                <button className="btn btn-gold text-[12px]" onClick={saveCurriculum} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            }
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide mb-1.5 block" style={{ color: '#8A8580' }}>Title</label>
                <input
                  className="input text-[13px] w-full"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. STEM Week - Robotics"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide mb-1.5 block" style={{ color: '#8A8580' }}>Description</label>
                <input
                  className="input text-[13px] w-full"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>Daily Activities</label>
                <button
                  onClick={addItem}
                  className="text-[11px] flex items-center gap-1"
                  style={{ color: '#B8973A' }}>
                  <Plus size={12} /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 rounded-lg" style={{ background: '#FAF7F2' }}>
                    <select
                      className="input text-[12px] w-28"
                      value={item.day}
                      onChange={e => updateItem(i, 'day', e.target.value)}>
                      <option value="">Day…</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input
                      className="input text-[12px] flex-1"
                      placeholder="Subject"
                      value={item.subject}
                      onChange={e => updateItem(i, 'subject', e.target.value)}
                    />
                    <input
                      className="input text-[12px] flex-[2]"
                      placeholder="Activity"
                      value={item.activity}
                      onChange={e => updateItem(i, 'activity', e.target.value)}
                    />
                    <input
                      className="input text-[12px] flex-1"
                      placeholder="Materials (optional)"
                      value={item.materials ?? ''}
                      onChange={e => updateItem(i, 'materials', e.target.value)}
                    />
                    <button
                      onClick={() => removeItem(i)}
                      className="p-2 rounded transition-colors hover:bg-red-50"
                      style={{ color: '#8A8580' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader 
            title={currentCurriculum?.title ?? `No curriculum for ${schoolName}`}
            action={
              <div className="flex gap-2">
                {currentCurriculum && (
                  <button 
                    onClick={deleteCurriculum}
                    className="btn text-[12px]"
                    style={{ color: '#791F1F', borderColor: 'rgba(121,31,31,0.3)' }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
                <button className="btn btn-gold text-[12px]" onClick={startEditing}>
                  {currentCurriculum ? 'Edit' : '+ Create Curriculum'}
                </button>
              </div>
            }
          />
          {currentCurriculum ? (
            <CardBody>
              {currentCurriculum.description && (
                <p className="text-[13px] mb-4" style={{ color: '#4A4640' }}>{currentCurriculum.description}</p>
              )}
              <div className="space-y-1">
                {DAYS.map(day => {
                  const dayItems = (currentCurriculum.content ?? []).filter(item => item.day === day)
                  if (dayItems.length === 0) return null
                  return (
                    <div key={day} className="flex gap-4 py-3" style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                      <div className="w-24 text-[12px] font-medium" style={{ color: '#B8973A' }}>{day}</div>
                      <div className="flex-1 space-y-1">
                        {dayItems.map((item, i) => (
                          <div key={i}>
                            <span className="text-[13px] font-medium">{item.subject}</span>
                            {item.activity && <span className="text-[13px]" style={{ color: '#4A4640' }}> — {item.activity}</span>}
                            {item.materials && <span className="text-[11px] ml-2 px-1.5 py-0.5 rounded" style={{ background: '#F5F0E8', color: '#8A8580' }}>{item.materials}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          ) : (
            <CardBody>
              <p className="text-[13px] text-center py-8" style={{ color: '#8A8580' }}>
                No curriculum has been created for this week yet.
              </p>
            </CardBody>
          )}
        </Card>
      )}

      {/* Recent curriculum entries */}
      <Card>
        <CardHeader title="Recent Entries" />
        <CardBody className="p-0">
          {curriculum.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>No curriculum entries yet</div>
          ) : (
            curriculum.slice(0, 10).map((c, i) => (
              <button
                key={c.id}
                onClick={() => { setSelectedSchool(c.school_id); setSelectedWeek(c.week_of); setEditing(false) }}
                className="w-full text-left flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#FAF7F2]"
                style={{ borderBottom: i < Math.min(curriculum.length, 10) - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#E8E4F8', color: '#5B4B8A' }}>
                  {c.school?.name}
                </span>
                <span className="text-[13px] font-medium flex-1">{c.title}</span>
                <span className="text-[12px]" style={{ color: '#8A8580' }}>{formatWeekLabel(c.week_of)}</span>
              </button>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}
