import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user
      const email = user.email?.toLowerCase() ?? ''
      const admin = createAdminClient()

      // Ensure profile exists
      const { data: existing } = await admin
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (!existing) {
        await admin.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
          role: 'parent',
        })
      }

      // Check for pending parent invites and auto-link
      const { data: invites } = await admin
        .from('parent_invites')
        .select('id, student_id')
        .ilike('email', email)

      if (invites?.length) {
        // Link each student to this parent
        for (const invite of invites) {
          await admin
            .from('students')
            .update({ parent_id: user.id })
            .eq('id', invite.student_id)
        }
        // Set role to parent if not already set
        if (!existing || existing.role !== 'admin') {
          await admin.from('profiles').update({ role: 'parent' }).eq('id', user.id)
        }
        // Remove used invites
        await admin.from('parent_invites').delete().ilike('email', email)
      }

      return NextResponse.redirect(`${origin}/`)
    }

    console.error('Auth callback error:', error?.message)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error?.message ?? 'Unknown error')}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}
