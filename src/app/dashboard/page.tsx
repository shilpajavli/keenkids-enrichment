import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const [studentsRes, attendanceRes, paymentsRes, announcementsRes] = await Promise.all([
    supabase.from('students').select('id, full_name').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('attendance').select('student_id, status').eq('date', today),
    supabase.from('payments').select('id, status, student_id').in('status', ['pending', 'overdue']),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
  ])

  const students = studentsRes.data ?? []
  const attendance = attendanceRes.data ?? []
  const payments = paymentsRes.data ?? []
  const announcements = announcementsRes.data ?? []

  const checkedIn = attendance.filter(a => a.status === 'present' || a.status === 'late').map(a => a.student_id)
  const notYet = students.filter(s => !checkedIn.includes(s.id))
  const presentCount = checkedIn.length
  const outstandingCount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length

  const greeting = 'Welcome'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">
          {greeting}, <em>{firstName}</em>
        </h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled', value: students.length, color: '#B8973A' },
          { label: 'Checked in today', value: presentCount, color: '#27500A' },
          { label: 'Not yet arrived', value: notYet.length, color: '#633806' },
          { label: 'Payments outstanding', value: outstandingCount, color: '#791F1F' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <div className="font-serif text-3xl font-light mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Not yet arrived */}
        <Card>
          <CardHeader title="Not yet arrived" action={
            <Link href="/dashboard/attendance" className="text-[11px]" style={{ color: '#B8973A' }}>
              Mark attendance →
            </Link>
          } />
          <CardBody className="p-0">
            {notYet.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>
                {students.length === 0 ? 'No students enrolled' : '🎉 Everyone is checked in!'}
              </div>
            ) : (
              notYet.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: i < notYet.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <span className="text-[13px]">{s.full_name}</span>
                  <Badge variant="gray">Not checked in</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Latest announcements */}
        <Card>
          <CardHeader title="Announcements" action={
            <Link href="/dashboard/community" className="text-[11px]" style={{ color: '#B8973A' }}>
              Post new →
            </Link>
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
    </div>
  )
}
