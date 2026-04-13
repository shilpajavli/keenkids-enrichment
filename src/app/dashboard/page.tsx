import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

const gradeLabel = (g: number) => g === 0 ? 'TK/K' : `Grade ${g}`

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = new Date().toISOString().slice(0, 10)
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const { data: students } = await supabase.from('students').select('id, full_name, grade').eq('program_id', programId ?? '').order('full_name')
  const { data: attendance } = await supabase.from('attendance').select('student_id, status').eq('date', today)
  const { data: announcements } = await supabase.from('announcements').select('id, title, body, pinned').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
  const { data: payments } = await supabase.from('payments').select('id').in('status', ['pending', 'overdue'])

  const checkedInIds = new Set((attendance ?? []).filter(a => a.status === 'present' || a.status === 'late').map(a => a.student_id))
  const present = (students ?? []).filter(s => checkedInIds.has(s.id))
  const absent = (students ?? []).filter(s => !checkedInIds.has(s.id))
  const outstandingCount = payments?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Welcome, <em>{firstName}</em></h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/students" className="card p-5 hover:opacity-80 transition-opacity">
          <div className="font-serif text-3xl font-light mb-1" style={{ color: '#8A6E25' }}>{students?.length ?? 0}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Enrolled</div>
        </Link>
        <Link href="/dashboard/attendance" className="card p-5 hover:opacity-80 transition-opacity">
          <div className="font-serif text-3xl font-light mb-1" style={{ color: '#27500A' }}>{present.length}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Checked in today</div>
        </Link>
        <Link href="/dashboard/attendance" className="card p-5 hover:opacity-80 transition-opacity">
          <div className="font-serif text-3xl font-light mb-1" style={{ color: '#633806' }}>{absent.length}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Not yet arrived</div>
        </Link>
        <Link href="/dashboard/payments" className="card p-5 hover:opacity-80 transition-opacity">
          <div className="font-serif text-3xl font-light mb-1" style={{ color: '#791F1F' }}>{outstandingCount}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Payments outstanding</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Not yet arrived */}
        <Card>
          <CardHeader title="Not yet arrived" action={
            <Link href="/dashboard/attendance" className="text-[11px]" style={{ color: '#B8973A' }}>Mark attendance →</Link>
          } />
          <CardBody className="p-0">
            {absent.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>🎉 Everyone is checked in!</div>
            ) : (
              absent.map((s, i) => (
                <Link key={s.id} href={`/dashboard/students/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#FAF7F2] transition-colors"
                  style={{ borderBottom: i < absent.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <span className="text-[13px]">{s.full_name}</span>
                  <Badge variant="gray">{gradeLabel(s.grade)}</Badge>
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
            {!announcements?.length ? (
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
