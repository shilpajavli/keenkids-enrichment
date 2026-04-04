'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Save, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatDate, calcProgress } from '@/lib/utils'
import type { Student, StudentSkill, TeacherNote, AttendanceRecord, MediaItem } from '@/types'
import MediaGrid from '@/components/media/MediaGrid'

interface Props {
  student: Student
  skills: StudentSkill[]
  notes: TeacherNote[]
  attendance: AttendanceRecord[]
  media: MediaItem[]
}

type Tab = 'progress' | 'attendance' | 'media' | 'notes'

const STATUS_BADGE: Record<string, { variant: any; label: string }> = {
  mastered:     { variant: 'green', label: 'Mastered' },
  in_progress:  { variant: 'blue',  label: 'In progress' },
  not_started:  { variant: 'gray',  label: 'Not started' },
}

const ATTEND_BADGE: Record<string, any> = {
  present: 'green',
  late:    'amber',
  absent:  'red',
}

const subjects = (skills: StudentSkill[]) =>
  [...new Set(skills.map(s => s.skill?.subject).filter(Boolean))]

export default function StudentProfile({ student, skills, notes, attendance, media }: Props) {
  const [tab, setTab] = useState<Tab>('progress')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Remove ${student.full_name} from enrollment? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/students?id=${student.id}`, { method: 'DELETE' })
    router.push('/dashboard/students')
  }

  const mastered = skills.filter(s => s.status === 'mastered').length
  const overall = calcProgress(mastered, skills.length)

  async function saveNote() {
    if (!noteText.trim()) return
    setSaving(true)
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id, content: noteText }),
    })
    setSaving(false)
    setNoteText('')
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'progress',   label: 'Progress'   },
    { id: 'attendance', label: 'Attendance' },
    { id: 'media',      label: `Media (${media.length})` },
    { id: 'notes',      label: 'Notes'      },
  ]

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/students"
          className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors"
          style={{ color: '#8A8580' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#B8973A')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A8580')}>
          <ArrowLeft size={13} /> All students
        </Link>

        <div className="flex items-center gap-5">
          <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="lg" />
          <div>
            <h1 className="font-serif text-3xl font-light">{student.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="blue">Grade {student.grade}</Badge>
              <span className="text-[12px]" style={{ color: '#8A8580' }}>
                Enrolled {formatDate(student.enrolled_at)}
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="font-serif text-3xl font-light" style={{ color: '#B8973A' }}>{overall}%</div>
              <div className="text-[11px]" style={{ color: '#8A8580' }}>overall progress</div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn text-[12px] flex items-center gap-1.5"
              style={{ color: '#791F1F', borderColor: 'rgba(121,31,31,0.3)' }}>
              <Trash2 size={13} />
              {deleting ? 'Removing…' : 'Remove student'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: 'rgba(184,151,58,0.22)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-2.5 text-[12.5px] border-b-2 transition-all"
            style={{
              borderBottomColor: tab === t.id ? '#B8973A' : 'transparent',
              color: tab === t.id ? '#8A6E25' : '#8A8580',
              fontWeight: tab === t.id ? 500 : 400,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#B8973A' : 'transparent'}`,
              cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Progress tab */}
      {tab === 'progress' && (
        <div className="grid grid-cols-2 gap-5">
          {subjects(skills).map(subject => {
            const subSkills = skills.filter(s => s.skill?.subject === subject)
            const subMastered = subSkills.filter(s => s.status === 'mastered').length
            const subPct = calcProgress(subMastered, subSkills.length)
            return (
              <Card key={subject}>
                <CardHeader title={subject ?? 'Unknown'}
                  action={<Badge variant={subPct >= 80 ? 'green' : subPct >= 40 ? 'blue' : 'gray'}>{subPct}% complete</Badge>} />
                <CardBody>
                  <ProgressBar value={subPct} showLabel={false} className="mb-4" />
                  <div className="space-y-2">
                    {subSkills.map(ss => {
                      const info = STATUS_BADGE[ss.status]
                      return (
                        <div key={ss.id} className="flex items-center justify-between py-1.5"
                          style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                          <span className="text-[12.5px]">{ss.skill?.name}</span>
                          <Badge variant={info.variant}>{info.label}</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Attendance tab */}
      {tab === 'attendance' && (
        <Card>
          <CardBody className="p-0">
            {attendance.map((rec, i) => (
              <div key={rec.id} className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: i < attendance.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div className="text-[12.5px] font-medium w-24">{formatDate(rec.date, 'MMM d, yyyy')}</div>
                <div className="flex-1 text-[12px]" style={{ color: '#8A8580' }}>
                  {(rec as any).class?.name ?? '—'}
                </div>
                {rec.note && (
                  <div className="text-[11.5px] italic flex-1" style={{ color: '#8A8580' }}>{rec.note}</div>
                )}
                <Badge variant={ATTEND_BADGE[rec.status]}>{rec.status}</Badge>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No attendance records yet</div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Media tab */}
      {tab === 'media' && (
        <MediaGrid items={media} />
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Add a note" />
            <CardBody>
              <textarea
                className="input mb-3 text-[13px]"
                rows={4}
                placeholder="Write a teacher's note about this student…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{ resize: 'none' }}
              />
              <button className="btn btn-gold" onClick={saveNote} disabled={saving}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save note'}
              </button>
            </CardBody>
          </Card>

          {notes.map(note => (
            <Card key={note.id}>
              <CardBody>
                <p className="text-[13px] leading-relaxed mb-2">{note.content}</p>
                <div className="text-[11px]" style={{ color: '#8A8580' }}>{formatDate(note.created_at, 'MMM d, yyyy · h:mm a')}</div>
              </CardBody>
            </Card>
          ))}

          {notes.length === 0 && (
            <div className="py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>No notes yet</div>
          )}
        </div>
      )}
    </div>
  )
}
