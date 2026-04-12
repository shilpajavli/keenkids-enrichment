import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import CommunityHub from '@/components/community/CommunityHub'

export const metadata = { title: 'Community — KeenKids Enrichment' }

export default async function CommunityPage() {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const [announcementsRes, parentsRes] = await Promise.all([
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    admin.from('profiles').select('id, full_name, email').eq('role', 'parent').order('full_name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Community</h1>
        <p className="text-ink-tertiary text-sm mt-1">Announcements, updates, and parent engagement</p>
      </div>
      <CommunityHub announcements={announcementsRes.data ?? []} parents={parentsRes.data ?? []} />
    </div>
  )
}
