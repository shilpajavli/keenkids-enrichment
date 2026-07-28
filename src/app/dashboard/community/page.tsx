export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import CommunityHub from '@/components/community/CommunityHub'

export const metadata = { title: 'Community — KeenKids Enrichment' }

export default async function CommunityPage() {
  const supabase = await createServerClient()
  const admin = createAdminClient()
  const programId = await getCurrentProgramId()

  // Get the school linked to the current program for filtering announcements
  const { data: program } = programId
    ? await supabase.from('programs').select('school_id').eq('id', programId).single()
    : { data: null }
  const schoolId = program?.school_id ?? null

  const parentsRaw = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?role=eq.parent&select=id,full_name,email,last_seen_at&order=full_name`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      cache: 'no-store',
    }
  )
  const allParentsRes = { data: await parentsRaw.json(), error: null }

  const [announcementsRes, programsRes, studentsRes] = await Promise.all([
    schoolId
      ? supabase.from('announcements').select('*').or(`school_id.eq.${schoolId},school_id.is.null`).order('pinned', { ascending: false }).order('created_at', { ascending: false })
      : supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('programs').select('id, name').order('start_date', { ascending: false }),
    programId
      ? admin.from('students').select('id, parent_id, program_id').eq('program_id', programId)
      : admin.from('students').select('id, parent_id, program_id'),
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
