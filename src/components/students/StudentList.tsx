'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
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

export default function StudentList({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')

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
        <div className="ml-auto text-[12px]" style={{ color: '#8A8580' }}>
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
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
