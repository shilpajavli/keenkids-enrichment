import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import DashboardHome from '@/components/dashboard/DashboardHome'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const todayDow = new Date().getDay() // 0=Sun, 1=Mon...

  const admin = createAdminClient()
  const [studentsRes, attendanceRes, paymentsRes, announcementsRes, classesRes, unlinkedParentsRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade, parent_id').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('attendance').select('student_id, status').eq('date', today),
    supabase.from('payments').select('id, status, student:students!inner(program_id)').in('status', ['pending', 'overdue']).eq('students.program_id', programId ?? ''),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    supabase.from('classes').select('id, name, start_time, end_time').eq('program_id', programId ?? '').eq('day_of_week', todayDow).order('name'),
    admin.from('profiles').select('id, full_name, email').eq('role', 'parent'),
  ])

  const checkedIn = (attendanceRes.data ?? [])
    .filter(a => a.status === 'present' || a.status === 'late')
    .map(a => a.student_id)

  const linkedParentIds = new Set((studentsRes.data ?? []).map((s: any) => s.parent_id).filter(Boolean))
  const unlinkedParents = (unlinkedParentsRes.data ?? []).filter((p: any) => !linkedParentIds.has(p.id))

  return (
    <DashboardHome
      students={studentsRes.data ?? []}
      checkedIn={checkedIn}
      outstandingCount={paymentsRes.data?.length ?? 0}
      announcements={announcementsRes.data ?? []}
      todayClasses={classesRes.data ?? []}
      firstName={firstName}
      today={today}
      unlinkedParents={unlinkedParents}
    />
  )
}
