'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import { formatDate } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

interface Student { id: string; full_name: string; grade: number; avatar_url: string | null }
interface ClassItem { id: string; name: string }
interface AttRecord { student_id: string; class_id: string; status: AttendanceStatus; note?: string }
interface HistoryItem { student_id: string; date: string; status: AttendanceStatus }

interface Props {
  students: Student[]
  classes: ClassItem[]
  todayRecords: AttRecord[]
  history: HistoryItem[]
  today: string
}

type Tab = 'mark' | 'history'

const ATTEND_VARIANT: Record<string, any> = { present: 'green', late: 'amber', absent: 'red' }

export default function AttendanceManager({ students, classes, todayRecords, history, today }: Props) {
  const [tab, setTab] = useState<Tab>('mark')
  const classId = classes[0]?.id ?? ''
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() => {
    const init: Record<string, AttendanceStatus> = {}
    students.forEach(s => {
      const existing = todayRecords.find(r => r.student_id === s.id)
      init[s.id] = existing?.status ?? 'absent'
    })
    return init
  })
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const grades = ['all', ...Array.from(new Set(students.map(s => String(s.grade)))).sort((a, b) => Number(a) - Number(b))]
  const gradeLabel = (g: string) => g === '0' ? 'TK/K' : `Grade ${g}`

  async function checkIn(studentId: string, status: AttendanceStatus) {
    setRecords(r => ({ ...r, [studentId]: status }))
    setSaving(s => ({ ...s, [studentId]: true }))
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ student_id: studentId, class_id: classId, date: today, status }]),
    })
    setSaving(s => ({ ...s, [studentId]: false }))
  }

  // Build grid data
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

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-0 border-b" style={{ borderColor: 'rgba(184,151,58,0.22)' }}>
        {(['mark', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              fontSize: '12.5px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? '#B8973A' : 'transparent'}`,
              color: tab === t ? '#8A6E25' : '#8A8580',
              fontWeight: tab === t ? 500 : 400,
              cursor: 'pointer',
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}>
            {t === 'mark' ? 'Mark attendance' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'mark' && (
        <Card>
          <CardHeader title={`${formatDate(today, 'EEEE, MMMM d')}`} action={
            <span className="text-[11px]" style={{ color: '#8A8580' }}>Tap any button to change status</span>
          } />
          <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid rgba(184,151,58,0.14)' }}>
            <input
              className="input flex-1 text-[14px]"
              placeholder="Search student name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              style={{ minHeight: '44px' }}
            />
            <select
              className="input w-auto text-[13px]"
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              style={{ minHeight: '44px' }}>
              {grades.map(g => (
                <option key={g} value={g}>{g === 'all' ? 'All grades' : gradeLabel(g)}</option>
              ))}
            </select>
          </div>
          <div>
            {students
              .filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()))
              .filter(s => gradeFilter === 'all' || String(s.grade) === gradeFilter)
              .map((student, i, arr) => {
              const status = records[student.id] ?? 'absent'
              const isSaving = saving[student.id]
              const colors: Record<string, string> = {
                present: '#EAF3DE', late: '#FAEEDA', absent: '#FCEBEB',
              }
              const textColors: Record<string, string> = {
                present: '#27500A', late: '#633806', absent: '#791F1F',
              }
              return (
                <div key={student.id} className="flex items-center gap-3 px-4 py-4 lg:px-5 lg:py-3.5"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none',
                    background: status === 'present' ? 'rgba(234,243,222,0.3)' : status === 'absent' ? 'rgba(252,235,235,0.2)' : 'rgba(250,238,218,0.2)' }}>
                  <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{student.full_name}</div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>{student.grade === 0 ? 'TK/K' : `Grade ${student.grade}`}</div>
                  </div>
                  <div className="flex gap-2">
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map(s => (
                      <button key={s}
                        onClick={() => checkIn(student.id, s)}
                        disabled={isSaving}
                        className="rounded-full capitalize transition-all"
                        style={{
                          background: status === s ? colors[s] : 'transparent',
                          color: status === s ? textColors[s] : '#8A8580',
                          border: `1px solid ${status === s ? colors[s] : 'rgba(184,151,58,0.22)'}`,
                          fontWeight: status === s ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '12px',
                          padding: '8px 14px',
                          minHeight: '40px',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] w-16 text-right hidden sm:block">
                    {isSaving
                      ? <span style={{ color: '#8A8580' }}>Saving…</span>
                      : status === 'present'
                        ? <span style={{ color: '#27500A', fontWeight: 600 }}>✓ In</span>
                        : status === 'late'
                          ? <span style={{ color: '#633806', fontWeight: 600 }}>✓ Late</span>
                          : null}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

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
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold"
                                style={cellStyle(st)}>
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
