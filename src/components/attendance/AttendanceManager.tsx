'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import { formatDate } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

interface Student { id: string; full_name: string; grade: number; avatar_url: string | null }
interface ClassItem { id: string; name: string }
interface AttRecord { student_id: string; class_id: string; status: AttendanceStatus; note?: string }
interface HistoryItem { date: string; status: AttendanceStatus; class?: { name: string } | { name: string }[] }

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

  const historyColumns = [
    { key: 'date', header: 'Date', width: '130px', render: (r: HistoryItem) => formatDate(r.date) },
    { key: 'class', header: 'Class', render: (r: HistoryItem) => (Array.isArray(r.class) ? r.class[0]?.name : r.class?.name) ?? '—' },
    { key: 'status', header: 'Status', width: '110px', render: (r: HistoryItem) => <Badge variant={ATTEND_VARIANT[r.status]}>{r.status}</Badge> },
  ]

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
          <CardHeader title={`${formatDate(today, 'EEEE, MMMM d')}`} />
          <div>
            {students.map((student, i) => {
              const status = records[student.id] ?? 'absent'
              const isSaving = saving[student.id]
              const colors: Record<string, string> = {
                present: '#EAF3DE', late: '#FAEEDA', absent: '#FCEBEB',
              }
              const textColors: Record<string, string> = {
                present: '#27500A', late: '#633806', absent: '#791F1F',
              }
              return (
                <div key={student.id} className="flex items-center gap-4 px-5 py-3.5"
                  style={{ borderBottom: i < students.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none',
                    background: status === 'present' ? 'rgba(234,243,222,0.3)' : status === 'absent' ? 'rgba(252,235,235,0.2)' : 'rgba(250,238,218,0.2)' }}>
                  <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="sm" />
                  <div className="w-40">
                    <div className="text-[13px] font-medium">{student.full_name}</div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>Grade {student.grade}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map(s => (
                      <button key={s}
                        onClick={() => checkIn(student.id, s)}
                        disabled={isSaving}
                        className="px-3 py-1 rounded-full text-[11px] capitalize transition-all"
                        style={{
                          background: status === s ? colors[s] : 'transparent',
                          color: status === s ? textColors[s] : '#8A8580',
                          border: `1px solid ${status === s ? colors[s] : 'rgba(184,151,58,0.22)'}`,
                          fontWeight: status === s ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto text-[11px]" style={{ color: '#8A8580' }}>
                    {isSaving ? 'Saving…' : status !== 'absent' ? '✓ Checked in' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <DataTable columns={historyColumns} data={history} keyField="date" emptyMessage="No attendance history yet" />
        </Card>
      )}
    </div>
  )
}
