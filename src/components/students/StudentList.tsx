'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, UserPlus, X, Mail, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import { calcProgress } from '@/lib/utils'
import type { School, EnrollmentType } from '@/types'

interface StudentRow {
  id: string
  full_name: string
  grade: number
  avatar_url: string | null
  classes: string[]
  enrolled_at: string
  created_at: string | null
  parent_notes?: string | null
  skills_mastered: number
  skills_total: number
  parent_id: string | null
  parent_email: string | null
  school_id: string | null
  enrollment_type: EnrollmentType
  enrolled_days: number[]
  school?: School
}

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
]

const ENROLLMENT_PRESETS: Record<EnrollmentType, number[]> = {
  '5_day': [1, 2, 3, 4, 5],
  '3_day': [1, 3, 5],
  '1_day': [1],
}

export default function StudentList({ students: initial, programId, schools = [], isTeacher = false, defaultSchoolId }: { students: StudentRow[]; programId: string | null; schools?: School[]; isTeacher?: boolean; defaultSchoolId?: string | null }) {
  const [students, setStudents] = useState(initial)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState(defaultSchoolId ?? 'all')
  const [planFilter, setPlanFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ 
    first_name: '', 
    last_name: '', 
    grade: '1',
    school_id: schools[0]?.id ?? '',
    enrollment_type: '5_day' as EnrollmentType,
    enrolled_days: [1, 2, 3, 4, 5] as number[],
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState('')

  function handleEnrollmentTypeChange(type: EnrollmentType) {
    setForm(f => ({ ...f, enrollment_type: type, enrolled_days: ENROLLMENT_PRESETS[type] }))
  }

  function toggleDay(day: number) {
    setForm(f => {
      const days = f.enrolled_days.includes(day)
        ? f.enrolled_days.filter(d => d !== day)
        : [...f.enrolled_days, day].sort()
      return { ...f, enrolled_days: days }
    })
  }

  function exportCSV() {
    const gradeLabel = (g: number) => g === 0 ? 'Kindergarten' : `Grade ${g}`
    const dayLabel = (d: number) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d] ?? d
    const rows = [
      ['Name', 'Grade', 'School', 'Plan', 'Days', 'Enrolled Date', 'Parent Email'],
      ...filtered.map(s => [
        s.full_name,
        gradeLabel(s.grade),
        s.school?.name ?? '',
        s.enrollment_type?.replace('_', '-') ?? '',
        (s.enrolled_days ?? []).map(dayLabel).join('/'),
        s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString('en-US') : '',
        s.parent_email ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function inviteAllParents() {
    setInviting(true)
    setInviteStatus('')
    const unlinked = students.filter(s => !s.parent_id)
    let sent = 0
    for (const s of unlinked) {
      const res = await fetch('/api/parent-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: s.id }),
      })
      if (res.ok) sent++
    }
    setInviting(false)
    setInviteStatus(`Invites sent to ${sent} parent${sent !== 1 ? 's' : ''}`)
    setTimeout(() => setInviteStatus(''), 4000)
  }

  async function addStudent() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        first_name: form.first_name.trim(), 
        last_name: form.last_name.trim(), 
        grade: Number(form.grade), 
        program_id: programId,
        school_id: form.school_id || null,
        enrollment_type: form.enrollment_type,
        enrolled_days: form.enrolled_days,
      }),
    })
    const json = await res.json()
    setAdding(false)
    if (json.error) { setAddError(json.error); return }
    const newStudent = { 
      ...json.data, 
      skills_mastered: 0, 
      skills_total: 0, 
      classes: [],
      school: schools.find(s => s.id === form.school_id),
    }
    setStudents(prev => [newStudent, ...prev])
    setForm({ 
      first_name: '', 
      last_name: '', 
      grade: '1',
      school_id: schools[0]?.id ?? '',
      enrollment_type: '5_day',
      enrolled_days: [1, 2, 3, 4, 5],
    })
    setShowAdd(false)
  }

  const grades = useMemo(() => [...new Set(students.map(s => s.grade))].sort(), [students])

  const filtered = useMemo(() =>
    students
      .filter(s => {
        const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase())
        const matchGrade = gradeFilter === 'all' || s.grade === Number(gradeFilter)
        const matchSchool = schoolFilter === 'all' || s.school_id === schoolFilter
        const matchPlan = planFilter === 'all' || s.enrollment_type === planFilter
        return matchSearch && matchGrade && matchSchool && matchPlan
      })
      .sort((a, b) => {
        if (!a.parent_id && b.parent_id) return -1
        if (a.parent_id && !b.parent_id) return 1
        return 0
      }),
    [students, search, gradeFilter, schoolFilter, planFilter]
  )

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const dayCounts = useMemo(() =>
    [1, 2, 3, 4, 5].map(d => ({
      day: DAY_NAMES[d - 1],
      count: filtered.filter(s => (s.enrolled_days ?? []).includes(d)).length,
    })),
    [filtered]
  )

  return (
    <div className="space-y-4">
      {/* Add student form */}
      {showAdd && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-light">Add new student</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} style={{ color: '#8A8580' }} /></button>
          </div>
          
          {/* Row 1: Name and Grade */}
          <div className="flex gap-3">
            <input
              className="input flex-1 text-[13px]"
              placeholder="First name"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              autoFocus
            />
            <input
              className="input flex-1 text-[13px]"
              placeholder="Last name"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            />
            <select
              className="input w-auto text-[13px]"
              value={form.grade}
              onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
              <option value="0">K</option>
              {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>

          {/* Row 2: School and Enrollment Type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium uppercase tracking-wide mb-1.5 block" style={{ color: '#8A8580' }}>School</label>
              <select
                className="input w-full text-[13px]"
                value={form.school_id}
                onChange={e => setForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">Select school…</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium uppercase tracking-wide mb-1.5 block" style={{ color: '#8A8580' }}>Program</label>
              <div className="flex gap-2">
                {(['5_day', '3_day', '1_day'] as EnrollmentType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleEnrollmentTypeChange(type)}
                    className="flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: form.enrollment_type === type ? '#EFE6CC' : '#F5F0E8',
                      color: form.enrollment_type === type ? '#8A6E25' : '#8A8580',
                      border: form.enrollment_type === type ? '1.5px solid #B8973A' : '1.5px solid transparent',
                    }}>
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Days of Week */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide mb-1.5 block" style={{ color: '#8A8580' }}>
              Enrolled Days
            </label>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className="w-12 py-2 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: form.enrolled_days.includes(day.value) ? '#EAF3DE' : '#F5F0E8',
                    color: form.enrolled_days.includes(day.value) ? '#27500A' : '#8A8580',
                    border: form.enrolled_days.includes(day.value) ? '1.5px solid #8BC34A' : '1.5px solid transparent',
                  }}>
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {addError && <p className="text-[12px]" style={{ color: '#791F1F' }}>{addError}</p>}
          <div className="flex gap-2 justify-end">
            <button className="btn text-[12px]" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-gold text-[12px]" onClick={addStudent} disabled={adding || !form.first_name || !form.last_name}>
              {adding ? 'Adding…' : 'Add student'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8A8580' }} />
          <input
            className="input pl-8 text-[12.5px]"
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {schools.length > 0 && (
          <select
            className="input w-auto text-[12.5px]"
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}>
            <option value="all">All schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select
          className="input w-auto text-[12.5px]"
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}>
          <option value="all">All grades</option>
          {grades.map(g => <option key={g} value={g}>{g === 0 ? 'K' : `Grade ${g}`}</option>)}
        </select>
        <select
          className="input w-auto text-[12.5px]"
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option>
          <option value="5_day">5-Day</option>
          <option value="3_day">3-Day</option>
          <option value="1_day">1-Day</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px]" style={{ color: '#8A8580' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          {inviteStatus && <span className="text-[12px]" style={{ color: '#27500A' }}>{inviteStatus}</span>}
          {!isTeacher && students.some(s => !s.parent_id) && (
            <button className="btn text-[12px] flex items-center gap-1.5" onClick={inviteAllParents} disabled={inviting}>
              <Mail size={13} /> {inviting ? 'Sending…' : 'Invite parents'}
            </button>
          )}
          {!isTeacher && (
            <button className="btn text-[12px] flex items-center gap-1.5" onClick={exportCSV}>
              <Download size={13} /> Export CSV
            </button>
          )}
          {!isTeacher && (
            <button className="btn btn-gold text-[12px] flex items-center gap-1.5" onClick={() => setShowAdd(true)}>
              <UserPlus size={13} /> Add student
            </button>
          )}
        </div>
      </div>

      {/* Day breakdown */}
      <div className="flex gap-3">
        {dayCounts.map(({ day, count }) => (
          <div key={day} className="flex-1 card p-3 text-center">
            <div className="font-serif text-xl font-light" style={{ color: '#1A1814' }}>{count}</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>{day}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <Card>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[13px]" style={{ color: '#8A8580' }}>
            No students match your search
          </div>
        )}
        {filtered.map((student, i) => {
          const progress = calcProgress(student.skills_mastered, student.skills_total)
          const isNew = student.created_at
            ? (Date.now() - new Date(student.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000
            : false
          return (
            <Link key={student.id} href={`/dashboard/students/${student.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAF7F2]"
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none',
              }}>
              <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[14px] font-medium" style={{ color: '#1A1814' }}>
                    {student.full_name}
                  </span>
                  <Badge variant="blue">{student.grade === 0 ? 'K' : `Grade ${student.grade}`}</Badge>
                  {student.school && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" 
                      style={{ background: '#E8E4F8', color: '#5B4B8A' }}>
                      {student.school.name}
                    </span>
                  )}
                  {student.enrollment_type && student.enrollment_type !== '5_day' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: '#FEF3C7', color: '#92400E' }}>
                      {student.enrollment_type.replace('_', '-')}
                    </span>
                  )}
                  {isNew && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: '#DCFCE7', color: '#166534' }}>
                      New
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] mb-2" style={{ color: '#8A8580' }}>
                  {student.enrolled_days?.length > 0 && (
                    <span>
                      {student.enrolled_days.map(d => DAYS.find(day => day.value === d)?.label).filter(Boolean).join('/')}
                      {' · '}
                    </span>
                  )}
                  Enrolled {student.enrolled_at?.slice(0, 7)}
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={progress} className="w-24" />
                  <span className="text-[11px]" style={{ color: '#8A8580' }}>
                    {student.skills_mastered}/{student.skills_total} skills
                  </span>
                </div>
                {student.parent_notes && (
                  <div className="mt-1.5 text-[11.5px] px-2 py-1 rounded-lg inline-flex items-center gap-1"
                    style={{ background: '#FFF9EC', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.25)' }}>
                    <span>📝</span> {student.parent_notes}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-[12px]" style={{ color: '#B8973A' }}>→</span>
                {student.parent_id ? (
                  <>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#EAF3DE', color: '#27500A' }}>✓ Parent linked</span>
                    {student.parent_email && (
                      <span className="text-[10px]" style={{ color: '#8A8580' }}>{student.parent_email}</span>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#8A8580' }}>No parent</span>
                )}
              </div>
            </Link>
          )
        })}
      </Card>
    </div>
  )
}
