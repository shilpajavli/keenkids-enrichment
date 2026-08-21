'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'

interface Props {
  studentId: string
  teacherName: string | null
  roomNumber: string | null
  needsEscort?: boolean
}

export default function StudentInfoCard({ teacherName: initial_teacher, roomNumber: initial_room, needsEscort: initial_escort = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [teacher, setTeacher] = useState(initial_teacher ?? '')
  const [room, setRoom] = useState(initial_room ?? '')
  const [escort, setEscort] = useState(initial_escort)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasNeither = !initial_teacher && !initial_room

  async function save() {
    setSaving(true)
    await fetch('/api/student-info', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_name: teacher.trim(), room_number: room.trim(), needs_escort: escort }),
    })
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (editing) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="font-serif text-[16px] font-light" style={{ color: '#1A1814' }}>Pickup Info</div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Teacher Name</label>
            <input
              className="input text-[13px]"
              placeholder="e.g. Ms. Johnson"
              value={teacher}
              onChange={e => setTeacher(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Classroom / Room #</label>
            <input
              className="input text-[13px]"
              placeholder="e.g. Room 12 or B-4"
              value={room}
              onChange={e => setRoom(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={escort}
              onChange={e => setEscort(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-[12.5px]" style={{ color: '#4A4640' }}>My child needs escort to program room</span>
          </label>
          <div className="flex gap-2">
            <button className="btn btn-gold text-[12px] py-1.5" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn text-[12px] py-1.5" style={{ color: '#8A8580' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (hasNeither) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-serif text-[15px] font-light mb-0.5" style={{ color: '#1A1814' }}>Help us pick up your child 🏫</div>
              <div className="text-[12.5px]" style={{ color: '#4A4640' }}>
                Add your child's teacher and classroom so we can escort them safely.
              </div>
            </div>
          </div>
          <button className="btn btn-gold text-[12px] py-1.5 mt-3" onClick={() => setEditing(true)}>
            Add pickup info
          </button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <div className="font-serif text-[15px] font-light" style={{ color: '#1A1814' }}>Pickup Info</div>
          <button className="text-[11px]" style={{ color: '#8A6E25' }} onClick={() => setEditing(true)}>Edit</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Teacher</div>
            <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{initial_teacher || '—'}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Classroom</div>
            <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{initial_room || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px]" style={{ color: initial_escort ? '#27500A' : '#8A8580' }}>
          <span>{initial_escort ? '✓' : '○'}</span>
          <span>Needs escort to program room</span>
        </div>
        {saved && <p className="text-[12px] mt-2" style={{ color: '#27500A' }}>✓ Saved</p>}
      </CardBody>
    </Card>
  )
}
