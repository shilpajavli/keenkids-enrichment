import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import CommunityHub from '@/components/community/CommunityHub'

export const metadata = { title: 'Community — KeenKids Enrichment' }

export default async function CommunityPage() {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const [announcementsRes, programsRes, allParentsRes, studentsRes] = await Promise.all([
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('programs').select('id, name').order('start_date', { ascending: false }),
    admin.from('profiles').select('id, full_name, email, last_seen_at').eq('role', 'parent').order('full_name'),
    admin.from('students').select('id, parent_id, program_id'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Community</h1>
        <p className="text-ink-tertiary text-sm mt-1">Announcements, updates, and parent engagement</p>
      </div>
      <CommunityHub
        announcements={announcementsRes.data ?? []}
        parents={allParentsRes.data ?? []}
        programs={programsRes.data ?? []}
        students={studentsRes.data ?? []}
      />
    </div>
  )
}
