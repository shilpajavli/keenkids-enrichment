import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import StudentProfile from '@/components/students/StudentProfile'

interface Props { params: { id: string } }

export default async function StudentDetailPage({ params }: Props) {
  const supabase = await createServerClient()

  const [studentRes, skillsRes, notesRes, attendanceRes, mediaRes] = await Promise.all([
    supabase.from('students').select('*').eq('id', params.id).single(),
    supabase.from('student_skills').select('*, skill:skills(*)').eq('student_id', params.id),
    supabase.from('teacher_notes').select('*').eq('student_id', params.id).order('created_at', { ascending: false }),
    supabase.from('attendance').select('*, class:classes(name)').eq('student_id', params.id).order('date', { ascending: false }).limit(20),
    supabase.from('media').select('*').eq('student_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!studentRes.data) notFound()

  return (
    <StudentProfile
      student={studentRes.data}
      skills={skillsRes.data ?? []}
      notes={notesRes.data ?? []}
      attendance={attendanceRes.data ?? []}
      media={mediaRes.data ?? []}
    />
  )
}
