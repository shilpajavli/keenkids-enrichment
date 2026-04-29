'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import { formatDate } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

interface Student {
  id: string
  full_name: string
  last_name?: string | null
  grade: number
  avatar_url: string | null
  room_number: string | null
  needs_escort: boolean | null
  teacher_name: string | null
  alerts: string | null
  session_day: string | null
}
interface ClassItem { id: string; name: string }
interface AttRecord {
  id: string
  student_id: string
  class_id?: string
  status: AttendanceStatus
  sign_in_time: string | null
  sign_out_time: string | null
}
interface HistoryItem { student_id: string; date: string; status: AttendanceStatus }

interface Props {
  students: Student[]
  classes: ClassItem[]
  todayRecords: AttRecord[]
  history: HistoryItem[]
  today: string
}

type Tab = 'roster' | 'mark' | 'history'

function getLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLocalDateDisplay() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function gradeLabel(g: number) {
  return g === 0 ? 'K' : `Grade ${g}`
}

export default function AttendanceManager({ students, classes, todayRecords, history, today: _today }: Props) {
  const today = getLocalDate()
  const [tab, setTab] = useState<Tab>('roster')
  const classId = classes[0]?.id ?? ''

  // Session day filter — default to today's weekday
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const sessionDays = [...new Set(students.map(s => s.session_day).filter(Boolean))] as string[]
  const [dayFilter, setDayFilter] = useState<string>(
    sessionDays.includes(todayDay) ? todayDay : (sessionDays[0] ?? 'all')
  )

  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {}
    students.forEach(s => {
      const existing = todayRecords.find(r => r.student_id === s.id)
      init[s.id] = existing?.status ?? 'absent'
    })
    return init
  })

  const [rosterRecords, setRosterRecords] = useState<Record<string, AttRecord>>(() => {
    const init: Record<string, AttRecord> = {}
    todayRecords.forEach(r => { init[r.student_id] = r })
    return init
  })

  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')

  const grades = ['all', ...Array.from(new Set(students.map(s => String(s.grade)))).sort((a, b) => Number(a) - Number(b))]

  const filteredStudents = students
    .filter(s => dayFilter === 'all' || !s.session_day || s.session_day === dayFilter)
    .filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()))
    .filter(s => gradeFilter === 'all' || String(s.grade) === gradeFilter)
    .sort((a, b) => a.full_name.localeCompare(b.full_name))

  // Mark attendance (existing flow)
  async function checkIn(studentId: string, status: AttendanceStatus) {
    setRecords(r => ({ ...r, [studentId]: status }))
    setSaving(s => ({ ...s, [studentId]: true }))
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ student_id: studentId, class_id: classId, date: today, status }]),
    })
    const json = await res.json()
    if (json.data?.[0]) {
      setRosterRecords(r => ({ ...r, [studentId]: json.data[0] }))
    }
    setSaving(s => ({ ...s, [studentId]: false }))
  }

  // Sign in — marks present + stamps time
  async function signIn(student: Student) {
    setSaving(s => ({ ...s, [student.id]: true }))
    const now = new Date().toISOString()
    // First upsert to get/create the record
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ student_id: student.id, class_id: classId, date: today, status: 'present', sign_in_time: now }]),
    })
    const json = await res.json()
    if (json.data?.[0]) {
      setRosterRecords(r => ({ ...r, [student.id]: json.data[0] }))
      setRecords(r => ({ ...r, [student.id]: 'present' }))
    }
    setSaving(s => ({ ...s, [student.id]: false }))
  }

  // Sign out — stamps sign_out_time
  async function signOut(student: Student) {
    const rec = rosterRecords[student.id]
    if (!rec?.id) return
    setSaving(s => ({ ...s, [student.id]: true }))
    const now = new Date().toISOString()
    const res = await fetch(`/api/attendance?id=${rec.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sign_out_time: now }),
    })
    const json = await res.json()
    if (json.data) {
      setRosterRecords(r => ({ ...r, [student.id]: json.data }))
    }
    setSaving(s => ({ ...s, [student.id]: false }))
  }

  // History helpers
  const dates = [...new Set(history.map(h => h.date))].sort()
  const cellStatus = (studentId: string, date: string): AttendanceStatus | null => {
    const rec = history.find(h => h.student_id === studentId && h.date === date)
    return rec?.status ?? null
  }
  const cellStyle = (s: AttendanceStatus | null) => {
    if (s === 'present') return { background: '#EAF3DE', color: '#27500A' }
    if (s === 'late')    return { background: '#FAEEDA', color: '#633806' }
    if (s === 'absent')  return { background: '#FCEBEB', color: '#791F1F' }
    return { background: '#F5F0E8', color: '#8A8580' }
  }
  const cellLabel = (s: AttendanceStatus | null) => {
    if (s === 'present') return '✓'
    if (s === 'late')    return 'L'
    if (s === 'absent')  return '✗'
    return '—'
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'roster',  label: 'Roster' },
    { id: 'mark',    label: 'Mark attendance' },
    { id: 'history', label: 'History' },
  ]

  // Filters bar
  const FiltersBar = () => (
    <div className="px-4 py-3 flex flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(184,151,58,0.14)' }}>
      {sessionDays.length > 1 && (
        <select className="input w-auto text-[13px]" value={dayFilter}
          onChange={e => setDayFilter(e.target.value)} style={{ minHeight: '40px' }}>
          <option value="all">All days</option>
          {sessionDays.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      )}
      <input className="input flex-1 text-[13px]" placeholder="Search…" value={search}
        onChange={e => setSearch(e.target.value)} style={{ minHeight: '40px', minWidth: 120 }} />
      <select className="input w-auto text-[13px]" value={gradeFilter}
        onChange={e => setGradeFilter(e.target.value)} style={{ minHeight: '40px' }}>
        {grades.map(g => <option key={g} value={g}>{g === 'all' ? 'All grades' : gradeLabel(Number(g))}</option>)}
      </select>
      <span className="text-[12px] self-center" style={{ color: '#8A8580' }}>
        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
      </span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-0 border-b" style={{ borderColor: 'rgba(184,151,58,0.22)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '8px 20px', fontSize: '12.5px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#B8973A' : 'transparent'}`,
              color: tab === t.id ? '#8A6E25' : '#8A8580',
              fontWeight: tab === t.id ? 500 : 400, cursor: 'pointer',
              transition: 'all .15s', fontFamily: 'inherit',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ROSTER TAB */}
      {tab === 'roster' && (
        <Card>
          <CardHeader title={getLocalDateDisplay()} action={
            <span className="text-[11px]" style={{ color: '#8A8580' }}>
              {filteredStudents.filter(s => rosterRecords[s.id]?.sign_in_time).length} signed in
              · {filteredStudents.filter(s => rosterRecords[s.id]?.sign_out_time).length} signed out
            </span>
          } />
          <FiltersBar />
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(184,151,58,0.2)', background: '#FAF7F2' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: '#8A8580' }}>Student</th>
                  <th className="text-left px-3 py-3 font-medium" style={{ color: '#8A8580' }}>Grade</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell" style={{ color: '#8A8580' }}>Room</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell" style={{ color: '#8A8580' }}>Teacher</th>
                  <th className="text-left px-3 py-3 font-medium hidden lg:table-cell" style={{ color: '#8A8580' }}>Notes</th>
                  <th className="text-center px-3 py-3 font-medium" style={{ color: '#8A8580' }}>Sign In</th>
                  <th className="text-center px-3 py-3 font-medium" style={{ color: '#8A8580' }}>Sign Out</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, i) => {
                  const rec = rosterRecords[student.id]
                  const signedIn = !!rec?.sign_in_time
                  const signedOut = !!rec?.sign_out_time
                  const isSav = saving[student.id]
                  return (
                    <tr key={student.id}
                      style={{
                        borderBottom: i < filteredStudents.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none',
                        background: signedOut ? 'rgba(234,243,222,0.4)' : signedIn ? 'rgba(234,243,222,0.15)' : 'white',
                      }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="sm" />
                          <div>
                            <div className="font-medium" style={{ color: '#1A1814' }}>{student.full_name}</div>
                            {student.needs_escort && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FAEEDA', color: '#633806' }}>⚑ Escort</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3" style={{ color: '#4A4640' }}>{gradeLabel(student.grade)}</td>
                      <td className="px-3 py-3 hidden md:table-cell" style={{ color: '#4A4640' }}>
                        {student.room_number ? <span className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: '#EFE6CC', color: '#8A6E25' }}>Room {student.room_number}</span> : <span style={{ color: '#C4B89A' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell" style={{ color: '#4A4640' }}>{student.teacher_name ?? <span style={{ color: '#C4B89A' }}>—</span>}</td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {student.alerts
                          ? <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#FCEBEB', color: '#791F1F' }}>⚠ {student.alerts}</span>
                          : <span style={{ color: '#C4B89A' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {signedIn
                          ? <span className="text-[12px] font-medium" style={{ color: '#27500A' }}>{formatTime(rec.sign_in_time)}</span>
                          : <button
                              onClick={() => signIn(student)}
                              disabled={isSav}
                              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                              style={{ background: '#EAF3DE', color: '#27500A', border: '1px solid #B8D99A', cursor: 'pointer' }}>
                              Sign In
                            </button>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {signedOut
                          ? <span className="text-[12px] font-medium" style={{ color: '#633806' }}>{formatTime(rec.sign_out_time)}</span>
                          : signedIn
                            ? <button
                                onClick={() => signOut(student)}
                                disabled={isSav}
                                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                                style={{ background: '#FAEEDA', color: '#633806', border: '1px solid #E8C49A', cursor: 'pointer' }}>
                                Sign Out
                              </button>
                            : <span style={{ color: '#C4B89A' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MARK TAB */}
      {tab === 'mark' && (
        <Card>
          <CardHeader title={getLocalDateDisplay()} action={
            <span className="text-[11px]" style={{ color: '#8A8580' }}>Tap to change status</span>
          } />
          <FiltersBar />
          <div>
            {filteredStudents.map((student, i, arr) => {
              const status = records[student.id] ?? 'absent'
              const isSav = saving[student.id]
              const colors: Record<string, string> = { present: '#EAF3DE', late: '#FAEEDA', absent: '#FCEBEB' }
              const textColors: Record<string, string> = { present: '#27500A', late: '#633806', absent: '#791F1F' }
              return (
                <div key={student.id} className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none',
                    background: status === 'present' ? 'rgba(234,243,222,0.3)' : status === 'absent' ? 'rgba(252,235,235,0.15)' : 'rgba(250,238,218,0.2)',
                  }}>
                  <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{student.full_name}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[11px]" style={{ color: '#8A8580' }}>{gradeLabel(student.grade)}</span>
                      {student.room_number && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#EFE6CC', color: '#8A6E25' }}>Room {student.room_number}</span>}
                      {student.needs_escort && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FAEEDA', color: '#633806' }}>⚑ Escort</span>}
                      {student.alerts && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FCEBEB', color: '#791F1F' }}>⚠ {student.alerts}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map(s => (
                      <button key={s} onClick={() => checkIn(student.id, s)} disabled={isSav}
                        className="rounded-full capitalize transition-all"
                        style={{
                          background: status === s ? colors[s] : 'transparent',
                          color: status === s ? textColors[s] : '#8A8580',
                          border: `1px solid ${status === s ? colors[s] : 'rgba(184,151,58,0.22)'}`,
                          fontWeight: status === s ? 600 : 400, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: '12px', padding: '7px 12px', minHeight: '38px',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            {dates.length === 0 ? (
              <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No attendance history yet</div>
            ) : (
              <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(184,151,58,0.2)' }}>
                    <th className="text-left px-5 py-3 font-medium" style={{ color: '#8A8580', minWidth: '160px' }}>Student</th>
                    {dates.map(d => (
                      <th key={d} className="px-3 py-3 font-medium text-center" style={{ color: '#8A8580', minWidth: '60px' }}>
                        <div>{formatDate(d, 'EEE')}</div>
                        <div style={{ color: '#B8973A' }}>{formatDate(d, 'MMM d')}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 font-medium text-center" style={{ color: '#8A8580' }}>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const presentDays = dates.filter(d => cellStatus(s.id, d) === 'present' || cellStatus(s.id, d) === 'late').length
                    return (
                      <tr key={s.id} style={{ borderBottom: i < students.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none' }}>
                        <td className="px-5 py-3 font-medium" style={{ color: '#1A1814' }}>{s.full_name}</td>
                        {dates.map(d => {
                          const st = cellStatus(s.id, d)
                          return (
                            <td key={d} className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold" style={cellStyle(st)}>
                                {cellLabel(st)}
                              </span>
                            </td>
                          )
                        })}
                        <td className="px-3 py-3 text-center font-medium" style={{ color: '#B8973A' }}>
                          {presentDays}/{dates.length}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
