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

  const { data: students } = await supabase.from('students').select('id, full_name, grade').eq('program_id', programId ?? '').order('full_name')
  const { data: attendance } = await supabase.from('attendance').select('student_id, status').eq('date', today)
  const { data: announcements } = await supabase.from('announcements').select('id, title, body, pinned').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
  const { data: classes } = await supabase.from('classes').select('id, name, start_time, end_time').eq('program_id', programId ?? '').eq('day_of_week', todayDow).order('name')
  const { data: payments } = await supabase.from('payments').select('id').in('status', ['pending', 'overdue'])

  const checkedIn = (attendance ?? [])
    .filter(a => a.status === 'present' || a.status === 'late')
    .map(a => a.student_id)

  return (
    <DashboardHome
      students={students ?? []}
      checkedIn={checkedIn}
      outstandingCount={payments?.length ?? 0}
      announcements={announcements ?? []}
      todayClasses={classes ?? []}
      firstName={firstName}
      unlinkedParents={[]}
    />
  )
}
