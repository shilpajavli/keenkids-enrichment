import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import AttendanceManager from '@/components/attendance/AttendanceManager'
import { format } from 'date-fns'

export const metadata = { title: 'Attendance — KeenKids Enrichment' }

export default async function AttendancePage() {
  const supabase = await createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const programId = await getCurrentProgramId()

  const [studentsRes, classesRes, todayRes, historyRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade, avatar_url').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('classes').select('*').eq('program_id', programId ?? '').order('day_of_week').order('start_time'),
    supabase.from('attendance').select('*').eq('date', today),
    supabase
      .from('attendance')
      .select('date, status, class:classes(name)')
      .order('date', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Attendance</h1>
        <p className="text-ink-tertiary text-sm mt-1">Mark and review daily attendance</p>
      </div>
      <AttendanceManager
        students={studentsRes.data ?? []}
        classes={classesRes.data ?? []}
        todayRecords={todayRes.data ?? []}
        history={historyRes.data ?? []}
        today={today}
      />
    </div>
  )
}
