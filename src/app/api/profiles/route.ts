import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  // Unlink from any students
  await admin.from('students').update({ parent_id: null }).eq('parent_id', id)
  // Delete from parent_invites
  await admin.from('parent_invites').delete().eq('email',
    (await admin.from('profiles').select('email').eq('id', id).single()).data?.email ?? ''
  )
  // Delete profile
  await admin.from('profiles').delete().eq('id', id)
  // Delete auth user
  await admin.auth.admin.deleteUser(id)

  return NextResponse.json({ success: true })
}
