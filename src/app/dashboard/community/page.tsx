import { createServerClient } from '@/lib/supabase-server'
import CommunityHub from '@/components/community/CommunityHub'

export const metadata = { title: 'Community — KeenKids Enrichment' }

export default async function CommunityPage() {
  const supabase = await createServerClient()

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Community</h1>
        <p className="text-ink-tertiary text-sm mt-1">Announcements, updates, and parent engagement</p>
      </div>
      <CommunityHub announcements={announcements ?? []} />
    </div>
  )
}
