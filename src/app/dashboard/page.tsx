export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import AutoRefresh from '@/components/ui/AutoRefresh'

const gradeLabel = (g: number) => g === 0 ? 'K' : `Grade ${g}`

function formatCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

const SCHEDULE: Record<string, Record<number, { emoji: string; title: string; color: string; tagline: string }>> = {
  sinnott: {
    1: { emoji: '💻', title: 'Coding & Technology',              color: '#2563EB', tagline: 'Code Today. Create Tomorrow.' },
    2: { emoji: '🔧', title: 'STEAM Build Day',                  color: '#EA580C', tagline: 'Build Ideas. Build Confidence.' },
    3: { emoji: '🧪', title: 'Science Lab & Experiments',        color: '#16A34A', tagline: 'Explore Science. Discover Possibilities.' },
    4: { emoji: '🎤', title: 'Public Speaking & Communication',  color: '#7C3AED', tagline: 'Speak Up. Stand Out.' },
    5: { emoji: '🎨', title: 'Free Exploration Station',         color: '#DC2626', tagline: 'Explore Freely. Create Fearlessly.' },
  },
  mattos: {
    1: { emoji: '🔧', title: 'STEAM Build Day',                  color: '#EA580C', tagline: 'Build Ideas. Build Confidence.' },
    2: { emoji: '💻', title: 'Coding & Technology',              color: '#2563EB', tagline: 'Code Today. Create Tomorrow.' },
    3: { emoji: '🎤', title: 'Public Speaking & Communication',  color: '#7C3AED', tagline: 'Speak Up. Stand Out.' },
    4: { emoji: '🧪', title: 'Science Lab & Experiments',        color: '#16A34A', tagline: 'Explore Science. Discover Possibilities.' },
    5: { emoji: '🎨', title: 'Free Exploration Station',         color: '#DC2626', tagline: 'Explore Freely. Create Fearlessly.' },
  },
}

const MONTHLY_THEMES: Record<string, { theme: string; emoji: string }> = {
  'September-2026': { theme: 'Motion & Transportation',  emoji: '🚗' },
  'October-2026':   { theme: 'Spooky Science',           emoji: '🧙' },
  'November-2026':  { theme: 'Engineering Machines',     emoji: '⚙️' },
  'December-2026':  { theme: 'Winter Builders',          emoji: '🏔️' },
  'January-2027':   { theme: 'Space Explorers',          emoji: '🪐' },
  'February-2027':  { theme: 'Electricity & Light',      emoji: '💡' },
  'March-2027':     { theme: 'Nature Engineers',         emoji: '🌱' },
  'April-2027':     { theme: 'Robotics & Coding',        emoji: '🤖' },
  'May-2027':       { theme: 'Inventor Challenge Month', emoji: '🏆' },
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name, role, school_id').eq('id', user?.id ?? '').single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const isTeacher = profile?.role === 'teacher'
  const teacherSchoolId = isTeacher ? (profile?.school_id ?? null) : null

  const weekStart = getMonday(new Date())

  const [studentsRes, programRes, allStudentsRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade, school_id').eq('program_id', programId ?? '').eq('status', 'active').order('full_name'),
    programId
      ? supabase.from('programs').select('name, school:schools(id, name)').eq('id', programId).single()
      : Promise.resolve({ data: null }),
    programId
      ? createAdminClient().from('students').select('id, status, created_at, updated_at').eq('program_id', programId)
      : Promise.resolve({ data: [] }),
  ])

  const allFetchedStudents = studentsRes.data ?? []
  const program   = programRes.data as any
  const schoolId  = program?.school?.id ?? null
  // For teachers: only show students if this program belongs to their school
  const students = teacherSchoolId
    ? (schoolId === teacherSchoolId ? allFetchedStudents : [])
    : allFetchedStudents
  const schoolName = (program?.school?.name ?? program?.name ?? '').toLowerCase()
  const schoolKey = schoolName.includes('sinnott') ? 'sinnott' : schoolName.includes('mattos') ? 'mattos' : null

  const studentIds = students.map(s => s.id)
  const allStudents = (allStudentsRes.data ?? []) as any[]

  const totalCancelled = allStudents.filter(s => s.status !== 'active').length
  const newThisWeek = allStudents.filter(s => s.status === 'active' && s.created_at >= weekStart).length
  const cancelledThisWeek = allStudents.filter(s => s.status !== 'active' && s.updated_at >= weekStart).length

  const weekOf = getMonday(new Date())
  const nowDate = new Date()
  const monthKey = `${nowDate.toLocaleString('en-US', { month: 'long' })}-${nowDate.getFullYear()}`
  const todayDow = nowDate.getDay() // 0=Sun, 1=Mon … 5=Fri, 6=Sat
  const todayActivity = schoolKey ? (SCHEDULE[schoolKey][todayDow] ?? null) : null
  const monthTheme = MONTHLY_THEMES[monthKey] ?? null

  const [attendanceRes, announcementsRes, paymentsRes, curriculumRes, revenueRes] = await Promise.all([
    supabase.from('attendance').select('student_id, status').eq('date', today),
    supabase.from('announcements').select('id, title, body, pinned').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    !isTeacher && studentIds.length
      ? supabase
          .from('payments')
          .select('id, amount_cents, status, due_date, student:students(id, full_name, grade)')
          .in('student_id', studentIds)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] }),
    schoolId
      ? supabase.from('curriculum').select('title, description, week_of').eq('school_id', schoolId).eq('week_of', weekOf).single()
      : Promise.resolve({ data: null }),
    !isTeacher
      ? createAdminClient()
          .from('payments')
          .select('amount_cents, status, refund_amount_cents, student_id, student:students(program:programs(school:schools(name)))')
          .in('status', ['paid', 'refunded'])
      : Promise.resolve({ data: [] }),
  ])

  const attendance     = attendanceRes.data ?? []
  const announcements  = announcementsRes.data ?? []
  const unpaidPayments = (paymentsRes.data ?? []) as any[]
  const curriculum     = curriculumRes.data as any
  const allRevPayments = (revenueRes.data ?? []) as any[]

  // Revenue by school
  type SchoolRev = { paid: number; refunded: number; studentIds: Set<string> }
  const revBySchool: Record<string, SchoolRev> = {}
  let totalRefundedCents = 0
  for (const p of allRevPayments) {
    const sname: string = (p.student as any)?.program?.school?.name ?? 'Unknown'
    const key = sname.toLowerCase().includes('sinnott') ? 'Sinnott' : sname.toLowerCase().includes('mattos') ? 'Mattos' : sname
    if (!revBySchool[key]) revBySchool[key] = { paid: 0, refunded: 0, studentIds: new Set() }
    if (p.status === 'paid') {
      revBySchool[key].paid += p.amount_cents
      if (p.student_id) revBySchool[key].studentIds.add(p.student_id)
    } else if (p.status === 'refunded') {
      const ref = p.refund_amount_cents ?? p.amount_cents
      revBySchool[key].refunded += ref
      totalRefundedCents += ref
    }
  }
  const revSchools = Object.entries(revBySchool).sort(([a], [b]) => a.localeCompare(b))
  const totalCollectedCents = revSchools.reduce((s, [, v]) => s + v.paid, 0)
  const netRevenueCents = totalCollectedCents - totalRefundedCents

  const checkedInIds = new Set(attendance.filter(a => a.status === 'present' || a.status === 'late').map(a => a.student_id))
  const present = (students ?? []).filter(s => checkedInIds.has(s.id))
  const absent  = (students ?? []).filter(s => !checkedInIds.has(s.id))

  // Group unpaid by student
  const unpaidByStudent = unpaidPayments.reduce((acc: Record<string, { student: any; totalCents: number; hasOverdue: boolean }>, p) => {
    const sid = p.student?.id
    if (!sid) return acc
    if (!acc[sid]) acc[sid] = { student: p.student, totalCents: 0, hasOverdue: false }
    acc[sid].totalCents += p.amount_cents
    if (p.status === 'overdue') acc[sid].hasOverdue = true
    return acc
  }, {})

  const unpaidStudents = Object.values(unpaidByStudent).sort((a: any, b: any) =>
    a.student.full_name.localeCompare(b.student.full_name)
  )

  const totalOutstandingCents = unpaidPayments.reduce((s, p) => s + p.amount_cents, 0)
  const overdueCount = unpaidStudents.filter((s: any) => s.hasOverdue).length

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Welcome, <em>{firstName}</em></h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })}
        </p>
      </div>

      {/* KPIs — teacher */}
      {isTeacher && (
        <div className="grid gap-4 grid-cols-3">
          <Link href="/dashboard/attendance" className="card p-5 hover:opacity-80 transition-opacity">
            <div className="font-serif text-3xl font-light mb-1" style={{ color: '#8A6E25' }}>{students.length}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>Total students</div>
          </Link>
          <Link href="/dashboard/attendance" className="card p-5 hover:opacity-80 transition-opacity">
            <div className="font-serif text-3xl font-light mb-1" style={{ color: '#27500A' }}>{present.length}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>Checked in today</div>
          </Link>
          <Link href="/dashboard/attendance" className="card p-5 hover:opacity-80 transition-opacity">
            <div className="font-serif text-3xl font-light mb-1" style={{ color: absent.length > 0 ? '#633806' : '#8A8580' }}>{absent.length}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>Yet to check in</div>
          </Link>
        </div>
      )}

      {/* KPIs — admin only */}
      {!isTeacher && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Enrollment card */}
          <div className="card p-5">
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-4" style={{ color: '#8A8580' }}>Enrollment</div>
            <div className="grid grid-cols-3 gap-3">
              <Link href="/dashboard/students" className="rounded-xl p-3 hover:opacity-80 transition-opacity" style={{ background: '#F0F7EC', border: '1px solid rgba(39,80,10,0.15)' }}>
                <div className="font-serif text-3xl font-light mb-1" style={{ color: '#27500A' }}>{students?.length ?? 0}</div>
                <div className="text-[11px] font-medium" style={{ color: '#27500A' }}>Active</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>Currently enrolled</div>
              </Link>
              <Link href="/dashboard/students" className="rounded-xl p-3 hover:opacity-80 transition-opacity" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
                <div className="font-serif text-3xl font-light mb-1" style={{ color: '#8A6E25' }}>{(students?.length ?? 0) + totalCancelled}</div>
                <div className="text-[11px] font-medium" style={{ color: '#8A6E25' }}>Total enrolled</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>Incl. cancellations</div>
              </Link>
              <Link href="/dashboard/students" className="rounded-xl p-3 hover:opacity-80 transition-opacity" style={{ background: totalCancelled > 0 ? '#FDF2F2' : '#F5F0E8', border: `1px solid ${totalCancelled > 0 ? 'rgba(121,31,31,0.15)' : 'rgba(184,151,58,0.2)'}` }}>
                <div className="font-serif text-3xl font-light mb-1" style={{ color: totalCancelled > 0 ? '#791F1F' : '#8A8580' }}>{totalCancelled}</div>
                <div className="text-[11px] font-medium" style={{ color: totalCancelled > 0 ? '#791F1F' : '#8A8580' }}>Cancelled</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>All time</div>
              </Link>
            </div>
          </div>

          {/* Revenue card */}
          {revSchools.length > 0 && (
            <div className="card p-5">
              <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-4" style={{ color: '#8A8580' }}>Revenue</div>
              <div className="grid grid-cols-3 gap-3">
                {/* Net revenue */}
                <div className="rounded-xl p-3" style={{ background: '#1A1814' }}>
                  <div className="font-serif text-2xl font-light mb-1" style={{ color: '#B8973A' }}>{formatCurrency(netRevenueCents)}</div>
                  <div className="text-[11px] font-medium" style={{ color: 'rgba(184,151,58,0.8)' }}>Net revenue</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(184,151,58,0.5)' }}>After refunds</div>
                </div>
                {/* Per school */}
                {revSchools.map(([name, rev]) => (
                  <div key={name} className="rounded-xl p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
                    <div className="font-serif text-2xl font-light mb-1" style={{ color: '#1A1814' }}>{formatCurrency(rev.paid - rev.refunded)}</div>
                    <div className="text-[11px] font-medium" style={{ color: '#8A6E25' }}>{name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>
                      {rev.studentIds.size} students
                      {rev.refunded > 0 && <span style={{ color: '#791F1F' }}> · −{formatCurrency(rev.refunded)} refunded</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      <div className={`grid gap-5 ${isTeacher ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
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

        {/* Outstanding payments — admin only */}
        {!isTeacher && <Card>
          <CardHeader
            title="Outstanding payments"
            action={
              <Link href="/dashboard/payments" className="text-[11px]" style={{ color: '#B8973A' }}>View all →</Link>
            }
          />
          <CardBody className="p-0">
            {unpaidStudents.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>
                🎉 All payments are collected!
              </div>
            ) : (
              <>
                {unpaidStudents.map((row: any, i: number) => (
                  <Link key={row.student.id} href="/dashboard/payments"
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#FAF7F2] transition-colors"
                    style={{ borderBottom: i < unpaidStudents.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                    <div>
                      <div className="text-[13px]">{row.student.full_name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                        {gradeLabel(row.student.grade)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium" style={{ color: row.hasOverdue ? '#791F1F' : '#633806' }}>
                        {formatCurrency(row.totalCents)}
                      </span>
                      <Badge variant={row.hasOverdue ? 'red' : 'amber'}>
                        {row.hasOverdue ? 'overdue' : 'pending'}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {/* Total row */}
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ background: '#FAF7F2', borderTop: '2px solid rgba(184,151,58,0.2)' }}>
                  <span className="text-[12px] font-medium" style={{ color: '#8A8580' }}>
                    Total outstanding
                    {overdueCount > 0 && <span style={{ color: '#791F1F' }}> · {overdueCount} overdue</span>}
                  </span>
                  <span className="text-[14px] font-semibold" style={{ color: '#791F1F' }}>
                    {formatCurrency(totalOutstandingCents)}
                  </span>
                </div>
              </>
            )}
          </CardBody>
        </Card>}
      </div>

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
  )
}
