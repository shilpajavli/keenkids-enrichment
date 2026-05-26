import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id } = await req.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Look up the invite record for this student
  const { data: invite } = await admin
    .from('parent_invites')
    .select('email')
    .eq('student_id', student_id)
    .single()

  if (!invite) return NextResponse.json({ error: 'No invite found for this student' }, { status: 404 })

  // Check if parent already has an account
  const { data: { users } } = await admin.auth.admin.listUsers()
  let parentUser = users.find((u: any) => u.email?.toLowerCase() === invite.email.toLowerCase())

  if (!parentUser) {
    // Send magic link invite email
    const { data, error } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    parentUser = data.user
  }

  // Upsert profile as parent — never downgrade an existing admin or teacher
  const { data: existing } = await admin.from('profiles').select('role').eq('id', parentUser.id).single()
  if (!existing || existing.role === 'parent') {
    await admin.from('profiles').upsert({
      id: parentUser.id,
      email: invite.email,
      full_name: invite.email.split('@')[0],
      role: 'parent',
    }, { onConflict: 'id' })
  }

  // Link student to parent
  await admin.from('students').update({ parent_id: parentUser.id }).eq('id', student_id)

  // Update payment records to include parent_id
  await admin.from('payments').update({ parent_id: parentUser.id }).eq('student_id', student_id)

  return NextResponse.json({ success: true, email: invite.email })
}
