import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import StudentProfile from '@/components/students/StudentProfile'

interface Props { params: Promise<{ id: string }> }

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  const [studentRes, skillsRes, notesRes, attendanceRes, mediaRes] = await Promise.all([
    supabase.from('students').select('*').eq('id', id).single(),
    supabase.from('student_skills').select('*, skill:skills(*)').eq('student_id', id),
    supabase.from('teacher_notes').select('*').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('attendance').select('*, class:classes(name)').eq('student_id', id).order('date', { ascending: false }).limit(20),
    supabase.from('media').select('*').eq('student_id', id).order('created_at', { ascending: false }),
  ])

  if (!studentRes.data) notFound()

  const student = studentRes.data
  let parentProfile: { full_name: string; email: string } | null = null
  if (student.parent_id) {
    const { data } = await supabase
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
    />
  )
}
