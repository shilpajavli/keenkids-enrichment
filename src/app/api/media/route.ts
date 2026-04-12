import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('student_id')
  const type = searchParams.get('type')

  let query = supabase
    .from('media')
    .select('*, student:students(id, full_name), class:classes(id, name)')
    .order('created_at', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const studentId = formData.get('student_id') as string | null
  const classId = formData.get('class_id') as string | null
  const caption = formData.get('caption') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isVideo = file.type.startsWith('video/')
  const ext = file.name.split('.').pop()
  const path = `${session.user.id}/${Date.now()}.${ext}`
  const bucket = isVideo ? 'Videos' : 'Photos'

  // Upload to Supabase Storage
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path)

  // Save metadata to DB
  const { data, error } = await supabase
    .from('media')
    .insert({
      student_id: studentId,
      class_id: classId,
      type: isVideo ? 'video' : 'photo',
      url: urlData.publicUrl,
      caption,
      uploaded_by: session.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
