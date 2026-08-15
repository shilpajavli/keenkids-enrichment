import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role, full_name } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
  if (!['teacher', 'parent'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const admin = createAdminClient()

  // Check if user already exists
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .single()

  if (existingProfile) {
    // Update role if needed
    if (existingProfile.role !== role) {
      await admin.from('profiles').update({ role, full_name: full_name || undefined }).eq('id', existingProfile.id)
    }
    return NextResponse.json({ message: 'User already exists — role updated.' })
  }

  // Send magic link invite via Supabase auth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? '', role },
    redirectTo: `${appUrl}/auth/callback`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pre-create profile with correct role so callback sets it right
  // (Supabase will create the auth user; we insert profile after)
  // We'll handle it in the callback using user_metadata.role
  return NextResponse.json({ message: `Invite sent to ${email}` })
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .in('role', ['teacher', 'parent'])
    .order('role')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
