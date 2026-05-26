import { createServerClient } from '@/lib/supabase-server'
import ReportsHub from '@/components/layout/ReportsHub'

export const metadata = { title: 'Reports — KeenKids Enrichment' }

export default async function ReportsPage() {
  const supabase = await createServerClient()
  const { data: students } = await supabase.from('students').select('id, full_name').order('last_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Reports</h1>
        <p className="text-ink-tertiary text-sm mt-1">Generate progress reports, summaries, and newsletters</p>
      </div>
      <ReportsHub students={students ?? []} />
    </div>
  )
}
