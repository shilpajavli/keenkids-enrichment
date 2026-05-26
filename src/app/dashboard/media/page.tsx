import { createServerClient } from '@/lib/supabase-server'
import MediaGallery from '@/components/media/MediaGallery'

export const metadata = { title: 'Media Gallery — KeenKids Enrichment' }

export default async function MediaPage() {
  const supabase = await createServerClient()

  const [mediaRes, studentsRes] = await Promise.all([
    supabase
      .from('media')
      .select('*, student:students(id, full_name), class:classes(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('students').select('id, full_name').order('last_name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Media gallery</h1>
        <p className="text-ink-tertiary text-sm mt-1">Photos and videos from every session</p>
      </div>
      <MediaGallery media={mediaRes.data ?? []} students={studentsRes.data ?? []} />
    </div>
  )
}
