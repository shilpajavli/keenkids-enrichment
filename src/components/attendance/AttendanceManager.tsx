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
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? '')
  const [records, setRecords] = useState<Record<string, { status: AttendanceStatus; note: string }>>(() => {
    const init: Record<string, { status: AttendanceStatus; note: string }> = {}
    students.forEach(s => {
      const existing = todayRecords.find(r => r.student_id === s.id)
      init[s.id] = { status: existing?.status ?? 'present', note: existing?.note ?? '' }
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRecords(r => ({ ...r, [studentId]: { ...r[studentId], status } }))
  }

  function setNote(studentId: string, note: string) {
    setRecords(r => ({ ...r, [studentId]: { ...r[studentId], note } }))
  }

  async function saveAttendance() {
    if (!selectedClass) return
    setSaving(true)
    const payload = students.map(s => ({
      student_id: s.id,
      class_id: selectedClass,
      date: today,
      status: records[s.id]?.status ?? 'present',
      note: records[s.id]?.note || null,
    }))
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
          <CardHeader
            title={`${formatDate(today, 'EEEE, MMMM d')}`}
            action={
              <div className="flex items-center gap-3">
                <select
                  className="input w-auto text-[12px]"
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  className="btn btn-gold text-[12px]"
                  onClick={saveAttendance}
                  disabled={saving}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save & notify →'}
                </button>
              </div>
            }
          />
          <div>
            {students.map((student, i) => (
              <div key={student.id} className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderBottom: i < students.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="sm" />
                <div className="w-40">
                  <div className="text-[13px] font-medium">{student.full_name}</div>
                  <div className="text-[11px]" style={{ color: '#8A8580' }}>Grade {student.grade}</div>
                </div>
                {/* Status buttons */}
                <div className="flex gap-1.5">
                  {(['present', 'late', 'absent'] as AttendanceStatus[]).map(s => {
                    const active = records[student.id]?.status === s
                    const colors: Record<string, string> = {
                      present: active ? '#EAF3DE' : 'transparent',
                      late:    active ? '#FAEEDA' : 'transparent',
                      absent:  active ? '#FCEBEB' : 'transparent',
                    }
                    const textColors: Record<string, string> = {
                      present: active ? '#27500A' : '#8A8580',
                      late:    active ? '#633806' : '#8A8580',
                      absent:  active ? '#791F1F' : '#8A8580',
                    }
                    return (
                      <button key={s}
                        onClick={() => setStatus(student.id, s)}
                        className="px-3 py-1 rounded-full text-[11px] capitalize transition-all"
                        style={{
                          background: colors[s],
                          color: textColors[s],
                          border: `1px solid ${active ? colors[s] : 'rgba(184,151,58,0.22)'}`,
                          fontWeight: active ? 500 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
                <input
                  className="input flex-1 text-[12px]"
                  placeholder="Note (optional)"
                  value={records[student.id]?.note ?? ''}
                  onChange={e => setNote(student.id, e.target.value)}
                />
              </div>
            ))}
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
