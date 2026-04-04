import { createServerClient } from '@/lib/supabase-server'
import ProgressTracker from '@/components/progress/ProgressTracker'

export const metadata = { title: 'Progress — KeenKids Enrichment' }

export default async function ProgressPage() {
  const supabase = await createServerClient()

  const [studentsRes, skillsRes] = await Promise.all([
    supabase.from('students').select('id, full_name, grade, avatar_url').order('last_name'),
    supabase.from('skills').select('*').order('subject').order('order'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Progress tracker</h1>
        <p className="text-ink-tertiary text-sm mt-1">Skills, milestones, and achievements by student</p>
      </div>
      <ProgressTracker
        students={studentsRes.data ?? []}
        allSkills={skillsRes.data ?? []}
      />
    </div>
  )
}
