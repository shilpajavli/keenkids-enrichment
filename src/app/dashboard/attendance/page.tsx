import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import AttendanceManager from '@/components/attendance/AttendanceManager'
import { format } from 'date-fns'

export const metadata = { title: 'Attendance — KeenKids Enrichment' }

export default async function AttendancePage() {
  const supabase = await createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const programId = await getCurrentProgramId()

  const [studentsRes, classesRes, todayRes] = await Promise.all([
    supabase.from('students').select('id, full_name, last_name, grade, avatar_url, room_number, needs_escort, teacher_name, alerts, session_day').eq('program_id', programId ?? '').order('last_name'),
    supabase.from('classes').select('*').eq('program_id', programId ?? '').order('day_of_week').order('start_time'),
    supabase.from('attendance').select('id, student_id, class_id, status, sign_in_time, sign_out_time').eq('date', today),
  ])

  const students = studentsRes.data ?? []
  const studentIds = students.map(s => s.id)

  const { data: history } = studentIds.length
    ? await supabase
        .from('attendance')
        .select('student_id, date, status')
        .in('student_id', studentIds)
        .order('date', { ascending: true })
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Attendance</h1>
        <p className="text-ink-tertiary text-sm mt-1">Mark and review daily attendance</p>
      </div>
      <AttendanceManager
        students={students}
        classes={classesRes.data ?? []}
        todayRecords={todayRes.data ?? []}
        history={history ?? []}
        today={today}
      />
    </div>
  )
}
