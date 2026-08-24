import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, full_name_signed, photo_consent, liability_consent } = await req.json()
  if (!student_id || !full_name_signed || !liability_consent) {
    return NextResponse.json({ error: 'Student, name, and liability waiver are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('consents').insert({
    student_id,
    parent_id: user.id,
    full_name_signed: full_name_signed.trim(),
    photo_consent,
    liability_consent,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
