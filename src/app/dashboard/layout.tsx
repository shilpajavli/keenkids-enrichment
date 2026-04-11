import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, programsRes, currentProgramId] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('programs').select('id, name, location').order('start_date', { ascending: false }),
    getCurrentProgramId(),
  ])

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar profile={profileRes.data} programs={programsRes.data ?? []} currentProgramId={currentProgramId} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar profile={profileRes.data} />
        <main className="flex-1 p-4 lg:p-8 overflow-auto pb-20 lg:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
