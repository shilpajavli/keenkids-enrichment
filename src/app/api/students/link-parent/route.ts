import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { student_id, parent_email, parent_name, slot = 'parent' } = await req.json()

  const admin = createAdminClient()

  // Find or invite the parent user
  const { data: users } = await admin.auth.admin.listUsers()
  let parentUser = users?.users.find((u: any) => u.email?.toLowerCase() === parent_email?.toLowerCase())

  if (!parentUser) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parent_email)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    parentUser = data.user
  }

  // Upsert their profile — never downgrade an existing admin/teacher
  const { data: existing } = await admin.from('profiles').select('role').eq('id', parentUser.id).single()
  if (!existing || existing.role === 'parent') {
    await admin.from('profiles').upsert({
      id: parentUser.id,
      email: parent_email,
      full_name: parent_name || parent_email.split('@')[0],
      role: 'parent',
    }, { onConflict: 'id' })
  }

  // Link to parent_id or parent2_id based on slot
  const field = slot === 'parent2' ? 'parent2_id' : 'parent_id'
  const { error } = await admin
    .from('students')
    .update({ [field]: parentUser.id })
    .eq('id', student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
