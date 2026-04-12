import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'

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
    <div className="min-h-screen" style={{ background: '#F7F4EF' }}>
      {/* Top bar */}
      <header style={{ background: '#1A1814' }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="https://keenkidsenrichment.com" className="flex items-center gap-3 hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(184,151,58,0.18)', border: '1px solid rgba(184,151,58,0.35)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="#B8973A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="font-serif text-white text-[17px] font-light leading-tight">
                <em className="italic" style={{ color: '#B8973A' }}>KeenKids</em> Enrichment
              </div>
              <div className="text-[10px] tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Parent Portal
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[12px] text-white/70">{profile.full_name}</div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
              style={{ background: '#8A6E25' }}>
              {getInitials(profile.full_name)}
            </div>
          </div>
        </div>
      </header>

      {/* Hero band */}
      <div style={{ background: 'linear-gradient(135deg, #1A1814 0%, #2C2820 100%)', borderBottom: '3px solid #B8973A' }}>
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="text-[11px] tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(184,151,58,0.7)' }}>
            Spring Break · Apr 13–17
          </div>
          <div className="font-serif text-2xl font-light text-white">
            Welcome back, {profile.full_name?.split(' ')[0]}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
