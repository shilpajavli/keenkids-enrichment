import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import DashboardHome from '@/components/dashboard/DashboardHome'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = new Date().toISOString().slice(0, 10)
  const todayDow = new Date().getDay()
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const [studentsRes, attendanceRes, announcementsRes, classesRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade, parent_id').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('attendance').select('student_id, status').eq('date', today),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    supabase.from('classes').select('id, name, start_time, end_time').eq('program_id', programId ?? '').eq('day_of_week', todayDow).order('name'),
  ])

  let outstandingCount = 0
  try {
    const paymentsRes = await supabase.from('payments').select('id, status, student:students!inner(program_id)').in('status', ['pending', 'overdue']).eq('students.program_id', programId ?? '')
    outstandingCount = paymentsRes.data?.length ?? 0
  } catch (e) { console.error('payments error', e) }

  const checkedIn = (attendanceRes.data ?? [])
    .filter(a => a.status === 'present' || a.status === 'late')
    .map(a => a.student_id)

  return (
    <DashboardHome
      students={studentsRes.data ?? []}
      checkedIn={checkedIn}
      outstandingCount={outstandingCount}
      announcements={announcementsRes.data ?? []}
      todayClasses={classesRes.data ?? []}
      firstName={firstName}
      unlinkedParents={[]}
    />
  )
}
