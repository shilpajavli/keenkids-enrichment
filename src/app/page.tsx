import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'

export default async function RootPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role === 'parent') redirect('/portal')
  redirect('/dashboard')
}
