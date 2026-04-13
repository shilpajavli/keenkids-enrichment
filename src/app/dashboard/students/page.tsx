import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import StudentList from '@/components/students/StudentList'

export const metadata = { title: 'Students — KeenKids Enrichment' }

export default async function StudentsPage() {
  const supabase = await createServerClient()
  const programId = await getCurrentProgramId()

  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      student_skills (status)
    `)
    .eq('program_id', programId ?? '')
    .order('full_name')

  const enriched = (students ?? []).map(s => ({
    ...s,
    skills_total: s.student_skills?.length ?? 0,
    skills_mastered: s.student_skills?.filter((sk: any) => sk.status === 'mastered').length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Students</h1>
        <p className="text-ink-tertiary text-sm mt-1">{enriched.length} enrolled</p>
      </div>
      <StudentList students={enriched} programId={programId} />
    </div>
  )
}
