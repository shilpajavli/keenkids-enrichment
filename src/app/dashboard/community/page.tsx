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

  const allParentsRes = await admin.from('profiles').select('id, full_name, email').eq('role', 'parent').order('full_name')

  const [announcementsRes, programsRes, studentsRes] = await Promise.all([
    schoolId
      ? supabase.from('announcements').select('*').or(`school_id.eq.${schoolId},school_id.is.null`).order('pinned', { ascending: false }).order('created_at', { ascending: false })
      : supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('programs').select('id, name').order('start_date', { ascending: false }),
    programId
      ? admin.from('students').select('id, parent_id, parent2_id, program_id').eq('program_id', programId)
      : admin.from('students').select('id, parent_id, parent2_id, program_id'),
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
