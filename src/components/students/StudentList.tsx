'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, UserPlus, X } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import { calcProgress } from '@/lib/utils'

interface StudentRow {
  id: string
  full_name: string
  grade: number
  avatar_url: string | null
  classes: string[]
  enrolled_at: string
  skills_mastered: number
  skills_total: number
}

export default function StudentList({ students: initial, programId }: { students: StudentRow[]; programId: string | null }) {
  const [students, setStudents] = useState(initial)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', grade: '1' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  async function addStudent() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), grade: Number(form.grade), program_id: programId }),
    })
    const json = await res.json()
    setAdding(false)
    if (json.error) { setAddError(json.error); return }
    setStudents(prev => [...prev, { ...json.data, skills_mastered: 0, skills_total: 0, classes: [] }])
    setForm({ first_name: '', last_name: '', grade: '1' })
    setShowAdd(false)
  }

  const grades = useMemo(() => [...new Set(students.map(s => s.grade))].sort(), [students])

  const filtered = useMemo(() =>
    students.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase())
      const matchGrade = gradeFilter === 'all' || s.grade === Number(gradeFilter)
      return matchSearch && matchGrade
    }),
    [students, search, gradeFilter]
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
              <option value="0">TK/K</option>
              {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8A8580' }} />
          <input
            className="input pl-8 text-[12.5px]"
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto text-[12.5px]"
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}>
          <option value="all">All grades</option>
          {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px]" style={{ color: '#8A8580' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-gold text-[12px] flex items-center gap-1.5" onClick={() => setShowAdd(true)}>
            <UserPlus size={13} /> Add student
          </button>
        </div>
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
          return (
            <div key={student.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors group"
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none',
              }}>
              <StudentAvatar name={student.full_name} avatarUrl={student.avatar_url} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-medium" style={{ color: '#1A1814' }}>
                    {student.full_name}
                  </span>
                  <Badge variant="blue">Grade {student.grade}</Badge>
                </div>
                <div className="text-[11.5px] mb-2" style={{ color: '#8A8580' }}>
                  {(student.classes ?? []).join(' · ')} · Enrolled {student.enrolled_at?.slice(0, 7)}
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={progress} className="w-24" />
                  <span className="text-[11px]" style={{ color: '#8A8580' }}>
                    {student.skills_mastered}/{student.skills_total} skills
                  </span>
                </div>
              </div>

              <Link href={`/dashboard/students/${student.id}`}
                className="btn text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                View profile →
              </Link>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
