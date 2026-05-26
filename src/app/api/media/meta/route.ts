import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, type, student_id, caption } = await req.json()
  if (!url || !type) return NextResponse.json({ error: 'Missing url or type' }, { status: 400 })

  const { data, error } = await supabase
    .from('media')
    .insert({ url, type, student_id, caption, uploaded_by: user.id })
    .select('*, student:students(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
