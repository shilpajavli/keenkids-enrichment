import { createServerClient } from '@/lib/supabase-server'
import StudentList from '@/components/students/StudentList'

export const metadata = { title: 'Students — KeenKids Enrichment' }

export default async function StudentsPage() {
  const supabase = await createServerClient()
  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      student_skills (status)
    `)
    .order('last_name')

  const enriched = (students ?? []).map(s => ({
    ...s,
    skills_total: s.student_skills?.length ?? 0,
    skills_mastered: s.student_skills?.filter((sk: any) => sk.status === 'mastered').length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Students</h1>
        <p className="text-ink-tertiary text-sm mt-1">{enriched.length} enrolled — Spring 2026 term</p>
      </div>
      <StudentList students={enriched} />
    </div>
  )
}
