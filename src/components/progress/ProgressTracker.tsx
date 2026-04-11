'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import StudentAvatar from '@/components/ui/StudentAvatar'
import { calcProgress } from '@/lib/utils'
import type { Skill, StudentSkill, SkillStatus } from '@/types'

interface StudentItem { id: string; full_name: string; grade: number; avatar_url: string | null }

interface Props {
  students: StudentItem[]
  allSkills: Skill[]
}

const STATUS_META: Record<SkillStatus, { variant: any; label: string }> = {
  mastered:    { variant: 'green', label: 'Mastered' },
  in_progress: { variant: 'blue',  label: 'In progress' },
  not_started: { variant: 'gray',  label: 'Not started' },
}

export default function ProgressTracker({ students, allSkills }: Props) {
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '')
  const [skills, setSkills] = useState<StudentSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const selected = students.find(s => s.id === selectedId)
  const subjects = [...new Set(allSkills.map(s => s.subject))]

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    fetch(`/api/students?student_id=${selectedId}`)
      .then(r => r.json())
      .then(d => { setSkills(d.data?.[0]?.student_skills ?? []); setLoading(false) })
  }, [selectedId])

  async function updateSkill(skillId: string, status: SkillStatus) {
    setSkills(prev => prev.map(s => s.skill_id === skillId ? { ...s, status } : s))
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: selectedId, skill_id: skillId, status }),
    })
  }

  async function saveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: selectedId, note: noteText }),
    })
    setSavingNote(false)
    setNoteText('')
  }

  const mastered = skills.filter(s => s.status === 'mastered').length
  const overall = calcProgress(mastered, skills.length)

  return (
    <div className="space-y-5">
      {/* Student selector */}
      <div className="flex items-center gap-3">
        <select
          className="input w-auto text-[13px]"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        {selected && (
          <div className="flex items-center gap-2">
            <StudentAvatar name={selected.full_name} avatarUrl={selected.avatar_url} size="sm" />
            <span className="text-[12.5px]" style={{ color: '#8A8580' }}>{selected.grade === 0 ? 'TK/K' : `Grade ${selected.grade}`}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="font-serif text-2xl font-light" style={{ color: '#B8973A' }}>{overall}%</span>
          <span className="text-[11px]" style={{ color: '#8A8580' }}>overall</span>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>Loading skills…</div>
      )}

      {!loading && (
        <>
          {/* Skills by subject */}
          <div className="grid grid-cols-2 gap-5">
            {subjects.map(subject => {
              const subjectSkills = allSkills.filter(s => s.subject === subject)
              const subStudentSkills = subjectSkills.map(sk => {
                const found = skills.find(ss => ss.skill_id === sk.id)
                return { ...sk, status: found?.status ?? ('not_started' as SkillStatus), student_skill_id: found?.id }
              })
              const subMastered = subStudentSkills.filter(s => s.status === 'mastered').length
              const subPct = calcProgress(subMastered, subjectSkills.length)

              return (
                <Card key={subject}>
                  <CardHeader
                    title={subject}
                    action={<Badge variant={subPct >= 80 ? 'green' : subPct >= 40 ? 'blue' : 'gray'}>{subPct}%</Badge>}
                  />
                  <CardBody>
                    <ProgressBar value={subPct} className="mb-4" />
                    <div className="space-y-1">
                      {subStudentSkills.map(sk => (
                        <div key={sk.id} className="flex items-center justify-between py-2"
                          style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                          <span className="text-[12.5px]">{sk.name}</span>
                          <div className="flex gap-1">
                            {(['not_started', 'in_progress', 'mastered'] as SkillStatus[]).map(st => (
                              <button key={st}
                                onClick={() => updateSkill(sk.id, st)}
                                className="px-2.5 py-0.5 rounded-full text-[10px] capitalize transition-all"
                                style={{
                                  background: sk.status === st
                                    ? (st === 'mastered' ? '#EAF3DE' : st === 'in_progress' ? '#E6F1FB' : '#F1EFE8')
                                    : 'transparent',
                                  color: sk.status === st
                                    ? (st === 'mastered' ? '#27500A' : st === 'in_progress' ? '#0C447C' : '#8A8580')
                                    : '#8A8580',
                                  border: '1px solid rgba(184,151,58,0.2)',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  fontWeight: sk.status === st ? 500 : 400,
                                }}>
                                {st === 'not_started' ? '–' : st === 'in_progress' ? '~' : '✓'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>

          {/* Teacher note */}
          <Card>
            <CardHeader title="Teacher's notes" />
            <CardBody>
              <textarea
                className="input mb-3 text-[13px]"
                rows={3}
                placeholder="Add a note about this student's progress…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                style={{ resize: 'none' }}
              />
              <button className="btn btn-gold text-[12px]" onClick={saveNote} disabled={savingNote}>
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
