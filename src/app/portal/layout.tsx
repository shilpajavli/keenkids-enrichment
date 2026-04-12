import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/auth/login')
  if (profile.role !== 'parent') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'rgba(184,151,58,0.22)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border flex items-center justify-center"
            style={{ borderColor: 'rgba(184,151,58,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="#B8973A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Link href="/portal" className="font-serif text-lg font-light hover:opacity-75 transition-opacity">KeenKids Enrichment</Link>
        </div>
        <div className="text-[12px]" style={{ color: '#8A8580' }}>
          Parent Portal · {profile.full_name}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
