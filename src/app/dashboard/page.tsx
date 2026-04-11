import { createServerClient } from '@/lib/supabase-server'
import KpiRow from '@/components/layout/KpiRow'
import AttendanceSummaryCard from '@/components/attendance/AttendanceSummaryCard'
import AnnouncementsList from '@/components/community/AnnouncementsList'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [studentsRes, attendanceRes, paymentsRes, announcementsRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('attendance').select('id, status').eq('date', today),
    supabase.from('payments').select('id, status').in('status', ['pending', 'overdue']),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4),
  ])

  const totalStudents = studentsRes.count ?? 0
  const presentToday = attendanceRes.data?.filter(a => a.status === 'present').length ?? 0
  const overduePayments = paymentsRes.data?.filter(p => p.status === 'overdue').length ?? 0

  const kpis = [
    { label: 'Enrolled students', value: totalStudents, accent: 'gold' as const },
    { label: 'Present today', value: presentToday, accent: 'green' as const },
    { label: 'Payments overdue', value: overduePayments, accent: 'red' as const },
    { label: 'Classes this week', value: 8, accent: 'blue' as const },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">
          Good Morning, <em>Shilpa</em>
        </h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <KpiRow kpis={kpis} />

      <div className="grid grid-cols-2 gap-5">
        <AttendanceSummaryCard date={today} />
        <AnnouncementsList announcements={announcementsRes.data ?? []} />
      </div>
    </div>
  )
}
