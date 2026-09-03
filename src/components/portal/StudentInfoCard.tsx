'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'

interface Props {
  studentId: string
  teacherName: string | null
  roomNumber: string | null
  needsEscort?: boolean
  pickupPerson?: string | null
  pickupNotes?: string | null
  grade?: number
}

const GRADE_OPTIONS = [
  { value: 0, label: 'Kindergarten' },
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
]

export default function StudentInfoCard({
  studentId,
  teacherName: initial_teacher,
  roomNumber: initial_room,
  needsEscort: initial_escort = false,
  pickupPerson: initial_pickup_person = null,
  pickupNotes: initial_pickup_notes = null,
  grade: initial_grade,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [teacher, setTeacher] = useState(initial_teacher ?? '')
  const [room, setRoom] = useState(initial_room ?? '')
  const [escort, setEscort] = useState(initial_escort)
  const [pickupPerson, setPickupPerson] = useState(initial_pickup_person ?? '')
  const [pickupNotes, setPickupNotes] = useState(initial_pickup_notes ?? '')
  const [grade, setGrade] = useState<number>(initial_grade ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const hasNeither = !initial_teacher && !initial_room && !initial_pickup_person

  async function save() {
    setSaving(true)
    await fetch('/api/student-info', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        teacher_name: teacher.trim() || null,
        room_number: room.trim() || null,
        needs_escort: escort,
        pickup_person: pickupPerson.trim() || null,
        pickup_notes: pickupNotes.trim() || null,
        grade,
      }),
    })
    setSaving(false)
    setSaved(true)
    setEditing(false)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  if (editing) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <div className="font-serif text-[16px] font-light" style={{ color: '#1A1814' }}>Pickup Info</div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Grade</label>
            <select className="input text-[13px]" value={grade} onChange={e => setGrade(Number(e.target.value))}>
              {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Teacher Name</label>
            <input className="input text-[13px]" placeholder="e.g. Ms. Johnson" value={teacher} onChange={e => setTeacher(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Classroom / Room #</label>
            <input className="input text-[13px]" placeholder="e.g. Room 12 or B-4" value={room} onChange={e => setRoom(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={escort} onChange={e => setEscort(e.target.checked)} className="w-4 h-4" />
            <span className="text-[12.5px]" style={{ color: '#4A4640' }}>My child needs escort to program room</span>
          </label>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Pickup Person</label>
            <input className="input text-[13px]" placeholder="e.g. Mom, Dad, Grandma…" value={pickupPerson} onChange={e => setPickupPerson(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.08em] block mb-1" style={{ color: '#8A8580' }}>Pickup Notes</label>
            <textarea
              className="input text-[13px]"
              rows={2}
              placeholder="e.g. My neighbor Sarah will pick up today, she drives a blue Honda"
              value={pickupNotes}
              onChange={e => setPickupNotes(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>
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
          <div className="font-serif text-[15px] font-light mb-0.5" style={{ color: '#1A1814' }}>Help us pick up your child 🏫</div>
          <div className="text-[12.5px] mb-3" style={{ color: '#4A4640' }}>
            Add your child's teacher, classroom, and who will be picking them up.
          </div>
          <button className="btn btn-gold text-[12px] py-1.5" onClick={() => setEditing(true)}>
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
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Grade</div>
            <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{GRADE_OPTIONS.find(o => o.value === initial_grade)?.label ?? '—'}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Teacher</div>
            <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{initial_teacher || '—'}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
            <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Classroom</div>
            <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{initial_room || '—'}</div>
          </div>
        </div>
        <div className="rounded-xl p-3 mb-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
          <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Pickup Person</div>
          <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{initial_pickup_person || '—'}</div>
          {initial_pickup_notes && (
            <div className="text-[12px] mt-1 italic" style={{ color: '#4A4640' }}>{initial_pickup_notes}</div>
          )}
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
