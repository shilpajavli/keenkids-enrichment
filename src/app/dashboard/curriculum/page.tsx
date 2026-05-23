import { createServerClient } from '@/lib/supabase-server'
import CurriculumManager from '@/components/curriculum/CurriculumManager'

export const metadata = { title: 'Curriculum — KeenKids Enrichment' }

function getMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

export default async function CurriculumPage() {
  const supabase = await createServerClient()
  const currentWeek = getMonday()

  const [schoolsRes, curriculumRes] = await Promise.all([
    supabase.from('schools').select('*').order('name'),
    supabase.from('curriculum').select('*, school:schools(*)').order('week_of', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Curriculum</h1>
        <p className="text-ink-tertiary text-sm mt-1">Manage weekly curriculum for each school</p>
      </div>
      <CurriculumManager 
        schools={schoolsRes.data ?? []} 
        initialCurriculum={curriculumRes.data ?? []}
        currentWeek={currentWeek}
      />
    </div>
  )
}
