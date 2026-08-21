import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teacher_name, room_number, needs_escort } = await req.json()

  const admin = createAdminClient()
  const { error } = await admin
    .from('students')
    .update({ teacher_name, room_number, needs_escort: needs_escort ?? false })
    .eq('parent_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
