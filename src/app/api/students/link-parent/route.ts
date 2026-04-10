import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { student_id, parent_email, parent_name } = await req.json()

  const admin = createAdminClient()

  // Find or invite the parent user
  const { data: users } = await admin.auth.admin.listUsers()
  let parentUser = users?.users.find((u: any) => u.email === parent_email)

  if (!parentUser) {
    // Invite them — they'll get a magic link email
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parent_email)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    parentUser = data.user
  }

  // Upsert their profile as parent
  await admin.from('profiles').upsert({
    id: parentUser.id,
    email: parent_email,
    full_name: parent_name || parent_email.split('@')[0],
    role: 'parent',
  }, { onConflict: 'id' })

  // Link the student to the parent
  const { error } = await supabase
    .from('students')
    .update({ parent_id: parentUser.id })
    .eq('id', student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
