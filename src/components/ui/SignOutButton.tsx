'use client'

import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button
      onClick={handleSignOut}
      title="Sign out"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
      style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'white'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
      }}>
      <LogOut size={13} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}
