'use client'

import { useState } from 'react'
import type { Student } from '@/types'

const REPORTS = [
  {
    id: 'progress',
    icon: '◈',
    title: 'Individual progress reports',
    desc: 'PDF-ready per student — skills, milestones, teacher notes, and attendance summary.',
  },
  {
    id: 'attendance',
    icon: '◎',
    title: 'Attendance summary',
    desc: 'Monthly attendance rates per student and class, with absence alerts.',
  },
  {
    id: 'payments',
    icon: '$',
    title: 'Payment & enrollment report',
    desc: 'Revenue collected, outstanding balances, and enrollment trends for the term.',
  },
  {
    id: 'newsletter',
    icon: '✉',
    title: 'Parent newsletter',
    desc: 'Weekly digest with class highlights, upcoming events, and student spotlights.',
  },
]

export default function ReportsHub({ students }: { students: Pick<Student, 'id' | 'full_name'>[] }) {
  const [generating, setGenerating] = useState<string | null>(null)

  function generate(id: string) {
    setGenerating(id)
    setTimeout(() => setGenerating(null), 2000)
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {REPORTS.map((r) => (
        <div key={r.id} className="card p-6 cursor-pointer group transition-all hover:shadow-sm"
          style={{ borderColor: generating === r.id ? '#B8973A' : undefined }}>
          <div className="font-serif text-4xl font-light mb-3" style={{ color: '#B8973A' }}>{r.icon}</div>
          <div className="font-serif text-[18px] font-light mb-1.5">{r.title}</div>
          <div className="text-[12.5px] leading-relaxed mb-5" style={{ color: '#8A8580' }}>{r.desc}</div>
          <button
            className="btn btn-gold text-[12px]"
            onClick={() => generate(r.id)}
            disabled={generating === r.id}>
            {generating === r.id ? 'Generating…' : 'Generate →'}
          </button>
        </div>
      ))}
    </div>
  )
}
