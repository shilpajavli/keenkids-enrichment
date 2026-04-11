import { createServerClient } from '@/lib/supabase-server'
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

  const [studentsRes, attendanceRes, paymentsRes, announcementsRes, classesRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('attendance').select('student_id, status').eq('date', today),
    supabase.from('payments').select('id, status').in('status', ['pending', 'overdue']),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    supabase.from('classes').select('id, name, start_time, end_time').eq('program_id', programId ?? '').eq('day_of_week', todayDow).order('start_time'),
  ])

  const checkedIn = (attendanceRes.data ?? [])
    .filter(a => a.status === 'present' || a.status === 'late')
    .map(a => a.student_id)

  return (
    <DashboardHome
      students={studentsRes.data ?? []}
      checkedIn={checkedIn}
      outstandingCount={paymentsRes.data?.length ?? 0}
      announcements={announcementsRes.data ?? []}
      todayClasses={classesRes.data ?? []}
      firstName={firstName}
      today={today}
    />
  )
}
