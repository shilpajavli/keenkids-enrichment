import { createServerClient } from '@/lib/supabase-server'
import WeeklySchedule from '@/components/layout/WeeklySchedule'

export const metadata = { title: 'Schedule — KeenKids Enrichment' }

export default async function SchedulePage() {
  const supabase = await createServerClient()

  const [classesRes, announcementsRes] = await Promise.all([
    supabase.from('classes').select('*, enrollments(count)').order('day_of_week').order('start_time'),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Schedule</h1>
        <p className="text-ink-tertiary text-sm mt-1">Weekly class schedule — Spring 2026</p>
      </div>
      <WeeklySchedule classes={classesRes.data ?? []} />
    </div>
  )
}
