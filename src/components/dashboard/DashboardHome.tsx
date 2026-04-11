'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

interface Student { id: string; full_name: string; grade: number }
interface ClassItem { id: string; name: string; start_time: string; end_time: string }
interface Props {
  students: Student[]
  checkedIn: string[]
  outstandingCount: number
  announcements: { id: string; title: string; body: string; pinned: boolean }[]
  todayClasses: ClassItem[]
  firstName: string
  today: string
}

type View = 'enrolled' | 'present' | 'absent'

const gradeLabel = (g: number) => g === 0 ? 'TK/K' : `Grade ${g}`

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${ampm}`
}

export default function DashboardHome({ students, checkedIn, outstandingCount, announcements, todayClasses, firstName, today }: Props) {
  const [view, setView] = useState<View>('absent')

  const present = students.filter(s => checkedIn.includes(s.id))
  const absent = students.filter(s => !checkedIn.includes(s.id))

  const viewData: Record<View, { label: string; list: Student[]; badge: any; empty: string }> = {
    enrolled: { label: 'All enrolled students', list: students, badge: 'blue', empty: 'No students enrolled' },
    present:  { label: 'Checked in today',      list: present,  badge: 'green', empty: 'No one checked in yet' },
    absent:   { label: 'Not yet arrived',        list: absent,   badge: 'gray',  empty: '🎉 Everyone is checked in!' },
  }

  const kpis: { key: View; label: string; value: number; color: string; bg: string }[] = [
    { key: 'enrolled', label: 'Enrolled',         value: students.length, color: '#8A6E25', bg: '#EFE6CC' },
    { key: 'present',  label: 'Checked in today', value: present.length,  color: '#27500A', bg: '#EAF3DE' },
    { key: 'absent',   label: 'Not yet arrived',  value: absent.length,   color: '#633806', bg: '#FAEEDA' },
  ]

  const current = viewData[view]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">
          Welcome, <em>{firstName}</em>
        </h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Clickable KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <button key={k.key} onClick={() => setView(k.key)}
            className="card p-5 text-left transition-all"
            style={{
              outline: view === k.key ? `2px solid ${k.color}` : '2px solid transparent',
              background: view === k.key ? k.bg : undefined,
            }}>
            <div className="font-serif text-3xl font-light mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>{k.label}</div>
            {view === k.key && <div className="text-[10px] mt-1.5 font-medium" style={{ color: k.color }}>Showing below ↓</div>}
          </button>
        ))}

        {/* Payments — links out */}
        <Link href="/dashboard/payments" className="card p-5 transition-all hover:outline hover:outline-2"
          style={{ outlineColor: '#791F1F' }}>
          <div className="font-serif text-3xl font-light mb-1" style={{ color: '#791F1F' }}>{outstandingCount}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Payments outstanding</div>
          <div className="text-[10px] mt-1.5 font-medium" style={{ color: '#791F1F' }}>View payments →</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dynamic student list */}
        <Card>
          <CardHeader title={current.label} action={
            <Link href="/dashboard/attendance" className="text-[11px]" style={{ color: '#B8973A' }}>
              Mark attendance →
            </Link>
          } />
          <CardBody className="p-0">
            {current.list.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>{current.empty}</div>
            ) : (
              current.list.map((s, i) => (
                <Link key={s.id} href={`/dashboard/students/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#FAF7F2]"
                  style={{ borderBottom: i < current.list.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <span className="text-[13px]">{s.full_name}</span>
                  <Badge variant={current.badge}>{gradeLabel(s.grade)}</Badge>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader title="Announcements" action={
            <Link href="/dashboard/community" className="text-[11px]" style={{ color: '#B8973A' }}>Post new →</Link>
          } />
          <CardBody className="p-0">
            {announcements.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>No announcements yet</div>
            ) : (
              announcements.map((ann, i) => (
                <div key={ann.id} className="px-5 py-4"
                  style={{ borderBottom: i < announcements.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {ann.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#EFE6CC', color: '#8A6E25' }}>Pinned</span>}
                    <div className="text-[13px] font-medium">{ann.title}</div>
                  </div>
                  <div className="text-[12px] leading-relaxed" style={{ color: '#4A4640' }}>{ann.body}</div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Today's agenda */}
      <Card>
        <CardHeader title="Today's agenda" action={
          <Link href="/dashboard/schedule" className="text-[11px]" style={{ color: '#B8973A' }}>Full schedule →</Link>
        } />
        <CardBody className="p-0">
          {todayClasses.length === 0 ? (
            <div className="px-5 py-6 text-center text-[13px]" style={{ color: '#8A8580' }}>No classes scheduled today</div>
          ) : (
            todayClasses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderBottom: i < todayClasses.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div className="text-[12px] font-medium w-28 flex-shrink-0" style={{ color: '#B8973A' }}>
                  {fmtTime(c.start_time)} – {fmtTime(c.end_time)}
                </div>
                <div className="text-[13px]">{c.name}</div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}
