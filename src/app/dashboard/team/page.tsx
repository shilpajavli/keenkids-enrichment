export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TeamManager from '@/components/team/TeamManager'

export default async function TeamPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light" style={{ color: '#1A1814' }}>Team & Access</h1>
        <p className="text-sm mt-1" style={{ color: '#8A8580' }}>Invite teachers and parents — they'll receive a magic link to sign in</p>
      </div>
      <TeamManager />
    </div>
  )
}
