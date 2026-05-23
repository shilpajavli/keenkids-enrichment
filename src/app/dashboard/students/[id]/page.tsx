import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import StudentProfile from '@/components/students/StudentProfile'

interface Props { params: Promise<{ id: string }> }

function getWeekBounds() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  const week = getWeekBounds()

  const [studentRes, skillsRes, notesRes, attendanceRes, mediaRes, schoolsRes, weeklyAttendanceRes] = await Promise.all([
    supabase.from('students').select('*, school:schools(*)').eq('id', id).single(),
    supabase.from('student_skills').select('*, skill:skills(*)').eq('student_id', id),
    supabase.from('teacher_notes').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('attendance').select('*, class:classes(name)').eq('student_id', id).order('date', { ascending: false }).limit(20),
    supabase.from('media').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('schools').select('*').order('name'),
    supabase.from('attendance')
      .select('id')
      .eq('student_id', id)
      .gte('date', week.start)
      .lte('date', week.end)
      .in('status', ['present', 'late']),
  ])

  if (!studentRes.data) notFound()

  const student = studentRes.data
  const weeklySessionsAttended = weeklyAttendanceRes.data?.length ?? 0
  
  let parentProfile: { full_name: string; email: string } | null = null
  if (student.parent_id) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', student.parent_id)
      .single()
    parentProfile = data
  }

  return (
    <StudentProfile
      student={student}
      skills={skillsRes.data ?? []}
      notes={notesRes.data ?? []}
      attendance={attendanceRes.data ?? []}
      media={mediaRes.data ?? []}
      parentProfile={parentProfile}
      schools={schoolsRes.data ?? []}
      weeklySessionsAttended={weeklySessionsAttended}
    />
  )
}
