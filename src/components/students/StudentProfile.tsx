'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Link2, Check } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatDate, calcProgress } from '@/lib/utils'
import type { Student, StudentSkill, TeacherNote, AttendanceRecord, MediaItem, School, EnrollmentType } from '@/types'
import MediaGrid from '@/components/media/MediaGrid'

interface Props {
  student: Student
  skills: StudentSkill[]
  notes: TeacherNote[]
  attendance: AttendanceRecord[]
  media: MediaItem[]
  parentProfile: { full_name: string; email: string } | null
  schools?: School[]
  weeklySessionsAttended?: number
}

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
]

const ENROLLMENT_LABELS: Record<EnrollmentType, string> = {
  '5_day': '5-day',
  '3_day': '3-day',
  '1_day': '1-day',
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

export default function StudentProfile({ student, skills, notes, attendance, media, parentProfile, schools = [], weeklySessionsAttended = 0 }: Props) {
  const [tab, setTab] = useState<Tab>('progress')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [roomNumber, setRoomNumber] = useState(student.room_number ?? '')
  const [needsEscort, setNeedsEscort] = useState(student.needs_escort ?? false)
  const [savingInfo, setSavingInfo] = useState(false)
  
  // School & enrollment state
  const [schoolId, setSchoolId] = useState(student.school_id ?? '')
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>(student.enrollment_type ?? '5_day')
  const [enrolledDays, setEnrolledDays] = useState<number[]>(student.enrolled_days ?? [1,2,3,4,5])
  const [savingEnrollment, setSavingEnrollment] = useState(false)

  const expectedSessions = enrolledDays.length
  const sessionProgress = expectedSessions > 0 ? Math.round((weeklySessionsAttended / expectedSessions) * 100) : 0

  async function saveLogisticsInfo() {
    setSavingInfo(true)
    await fetch(`/api/students?id=${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_number: roomNumber || null, needs_escort: needsEscort }),
    })
    setSavingInfo(false)
  }

  async function saveEnrollmentInfo() {
    setSavingEnrollment(true)
    await fetch(`/api/students?id=${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        school_id: schoolId || null, 
        enrollment_type: enrollmentType,
        enrolled_days: enrolledDays,
      }),
    })
    setSavingEnrollment(false)
  }

  function toggleDay(day: number) {
    setEnrolledDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }
  const [deleting, setDeleting] = useState(false)
  const [skillsState, setSkillsState] = useState(skills)
  const [showLinkParent, setShowLinkParent] = useState(false)
  const [parentEmail, setParentEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; email: string; full_name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()

  async function updateSkill(id: string, status: 'not_started' | 'in_progress' | 'mastered') {
    setSkillsState(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await fetch('/api/skills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
  }

  async function searchParents(q: string) {
    setParentEmail(q)
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`)
    const { data } = await res.json()
    setSuggestions(data ?? [])
    setShowSuggestions(true)
  }

  function selectSuggestion(s: { email: string; full_name: string }) {
    setParentEmail(s.email)
    setParentName(s.full_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function linkParent() {
    if (!parentEmail) return
    setLinking(true)
    const res = await fetch('/api/students/link-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: student.id, parent_email: parentEmail, parent_name: parentName }),
    })
    const json = await res.json()
    setLinking(false)
    if (json.success) {
      setLinkMsg(`✓ ${parentEmail} linked to ${student.first_name}`)
      setParentEmail('')
      setParentName('')
      setShowLinkParent(false)
    } else {
      setLinkMsg(`Error: ${json.error}`)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${student.full_name} from enrollment? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/students?id=${student.id}`, { method: 'DELETE' })
    router.push('/dashboard/students')
  }

  const mastered = skillsState.filter(s => s.status === 'mastered').length
  const overall = calcProgress(mastered, skillsState.length)

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
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="blue">{student.grade === 0 ? 'K' : `Grade ${student.grade}`}</Badge>
              {student.school && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" 
                  style={{ background: '#E8E4F8', color: '#5B4B8A' }}>
                  {student.school.name}
                </span>
              )}
              {enrollmentType !== '5_day' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full" 
                  style={{ background: '#FEF3C7', color: '#92400E' }}>
                  {ENROLLMENT_LABELS[enrollmentType]}
                </span>
              )}
              <span className="text-[12px]" style={{ color: '#8A8580' }}>
                Enrolled {formatDate(student.enrolled_at)}
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {enrollmentType !== '5_day' && (
              <div className="text-right">
                <div className="font-serif text-2xl font-light" style={{ color: sessionProgress >= 100 ? '#27500A' : '#633806' }}>
                  {weeklySessionsAttended}/{expectedSessions}
                </div>
                <div className="text-[11px]" style={{ color: '#8A8580' }}>sessions this week</div>
              </div>
            )}
            <div className="text-right">
              <div className="font-serif text-3xl font-light" style={{ color: '#B8973A' }}>{overall}%</div>
              <div className="text-[11px]" style={{ color: '#8A8580' }}>overall progress</div>
            </div>
            <button
              onClick={() => setShowLinkParent(p => !p)}
              className="btn text-[12px] flex items-center gap-1.5"
              style={{ color: '#8A6E25' }}>
              <Link2 size={13} />
              Link parent
            </button>
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

      {/* Link parent panel */}
      {showLinkParent && (
        <Card>
          <CardBody>
            <p className="text-[12.5px] mb-3" style={{ color: '#4A4640' }}>
              Ask the parent to log in first at <strong>/portal</strong> using their Google account. Then search their email below to link them to {student.first_name}.
            </p>
            <div className="flex gap-2">
              <input
                className="input text-[12.5px] flex-1"
                placeholder="Parent name"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
              />
              <div className="relative flex-1">
                <input
                  className="input text-[12.5px] w-full"
                  placeholder="Parent email"
                  type="email"
                  value={parentEmail}
                  onChange={e => searchParents(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg"
                    style={{ background: '#fff', borderColor: 'rgba(184,151,58,0.32)' }}>
                    {suggestions.map(s => (
                      <button key={s.id} onMouseDown={() => selectSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#FAF7F2] transition-colors">
                        <div className="font-medium">{s.full_name}</div>
                        <div style={{ color: '#8A8580' }}>{s.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn-gold text-[12px]"
                onClick={linkParent}
                disabled={linking || !parentEmail}>
                {linking ? 'Linking…' : 'Link parent'}
              </button>
            </div>
            {linkMsg && <p className="text-[12px] mt-2" style={{ color: linkMsg.startsWith('✓') ? '#27500A' : '#791F1F' }}>{linkMsg}</p>}
          </CardBody>
        </Card>
      )}

      {/* Enrollment Info */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>Enrollment Info</span>
            <button className="btn btn-gold text-[11px]" onClick={saveEnrollmentInfo} disabled={savingEnrollment}>
              {savingEnrollment ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="space-y-4">
            {/* School & Program Type */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[12.5px]" style={{ color: '#4A4640' }}>School</label>
                <select
                  className="input text-[13px] w-32"
                  value={schoolId}
                  onChange={e => setSchoolId(e.target.value)}>
                  <option value="">Select…</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[12.5px]" style={{ color: '#4A4640' }}>Program</label>
                <div className="flex gap-1">
                  {(['5_day', '3_day', '1_day'] as EnrollmentType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEnrollmentType(type)}
                      className="py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        background: enrollmentType === type ? '#EFE6CC' : '#F5F0E8',
                        color: enrollmentType === type ? '#8A6E25' : '#8A8580',
                        border: enrollmentType === type ? '1.5px solid #B8973A' : '1.5px solid transparent',
                      }}>
                      {ENROLLMENT_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Days of Week */}
            <div className="flex items-center gap-2">
              <label className="text-[12.5px]" style={{ color: '#4A4640' }}>Days</label>
              <div className="flex gap-1">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className="w-10 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                    style={{
                      background: enrolledDays.includes(day.value) ? '#EAF3DE' : '#F5F0E8',
                      color: enrolledDays.includes(day.value) ? '#27500A' : '#8A8580',
                      border: enrolledDays.includes(day.value) ? '1.5px solid #8BC34A' : '1.5px solid transparent',
                    }}>
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Logistics */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-medium uppercase tracking-wide" style={{ color: '#8A8580' }}>Pickup Info</span>
            <button className="btn btn-gold text-[11px]" onClick={saveLogisticsInfo} disabled={savingInfo}>
              {savingInfo ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[12.5px]" style={{ color: '#4A4640' }}>Room #</label>
              <input
                className="input text-[13px] w-24"
                placeholder="e.g. 12"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={needsEscort}
                onChange={e => setNeedsEscort(e.target.checked)}
              />
              <span className="text-[12.5px]" style={{ color: '#4A4640' }}>Needs escort to program room</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Parent info */}
      {parentProfile ? (
        <div className="flex items-center gap-2 text-[12.5px] px-1" style={{ color: '#4A4640' }}>
          <span style={{ color: '#8A8580' }}>Parent:</span>
          <span className="font-medium">{parentProfile.full_name}</span>
          <span style={{ color: '#8A8580' }}>·</span>
          <span style={{ color: '#8A8580' }}>{parentProfile.email}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[12px] px-1" style={{ color: '#8A8580' }}>
          <span>No parent linked yet</span>
        </div>
      )}

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
          {subjects(skillsState).map(subject => {
            const subSkills = skillsState.filter(s => s.skill?.subject === subject)
            const subMastered = subSkills.filter(s => s.status === 'mastered').length
            const subPct = calcProgress(subMastered, subSkills.length)
            const DATE_MAP: Record<string, string> = {
              'Bio-Engineering':            'Mon · Apr 13',
              'Cargo & Balance':            'Tue · Apr 14',
              'Solar Optics':               'Wed · Apr 15',
              'Aerodynamics & Wind Power':  'Thu · Apr 16',
              'Global Engineering Summit':  'Fri · Apr 17',
            }
            const date = subject ? DATE_MAP[subject] : null
            return (
              <Card key={subject}>
                <CardHeader
                  title={subject ?? 'Unknown'}
                  action={
                    <div className="flex items-center gap-2">
                      {date && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#EFE6CC', color: '#8A6E25' }}>{date}</span>}
                      <Badge variant={subPct >= 80 ? 'green' : subPct >= 40 ? 'blue' : 'gray'}>{subPct}% complete</Badge>
                    </div>
                  }
                />
                <CardBody>
                  <ProgressBar value={subPct} showLabel={false} className="mb-4" />
                  <div className="space-y-2">
                    {subSkills.map(ss => {
                      return (
                        <div key={ss.id} className="flex items-center justify-between py-1.5"
                          style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                          <span className="text-[12.5px]" style={{ color: '#1A1814' }}>{ss.skill?.name}</span>
                          <select
                            value={ss.status}
                            onChange={e => updateSkill(ss.id, e.target.value as any)}
                            className="text-[11px] rounded-full px-2 py-0.5 border-0 cursor-pointer"
                            style={{
                              background: ss.status === 'mastered' ? '#EAF3DE' : ss.status === 'in_progress' ? '#EEF2FF' : '#F0EFED',
                              color: ss.status === 'mastered' ? '#27500A' : ss.status === 'in_progress' ? '#3730A3' : '#4A4640',
                              fontFamily: 'inherit',
                            }}>
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="mastered">Mastered</option>
                          </select>
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
                <Check size={13} /> {saving ? 'Saving…' : 'Save note'}
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
