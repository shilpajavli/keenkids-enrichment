'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import type { Profile } from '@/types'
import {
  LayoutDashboard, Users, CalendarCheck, TrendingUp,
  Clock, Image, CreditCard, MessageCircle, FileText, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const NAV = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard',            label: 'Home',          icon: LayoutDashboard },
      { href: '/dashboard/students',   label: 'Students',      icon: Users },
      { href: '/dashboard/attendance', label: 'Attendance',    icon: CalendarCheck },
    ],
  },
  {
    section: 'Learning',
    items: [
      { href: '/dashboard/progress', label: 'Progress',       icon: TrendingUp },
      { href: '/dashboard/schedule', label: 'Schedule',       icon: Clock },
      { href: '/dashboard/media',    label: 'Media gallery',  icon: Image },
    ],
  },
  {
    section: 'Admin',
    items: [
      { href: '/dashboard/payments',  label: 'Payments',   icon: CreditCard },
      { href: '/dashboard/community', label: 'Community',  icon: MessageCircle },
      { href: '/dashboard/reports',   label: 'Reports',    icon: FileText },
    ],
  },
]

interface Props { profile: Profile | null }

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: '#1A1814' }}>
      {/* Brand */}
      <div className="px-6 py-7 border-b border-white/8">
        <div className="font-serif text-[22px] font-light text-white leading-tight">
          <em className="italic" style={{ color: '#B8973A' }}>KeenKids</em> Enrichment
        </div>
        <div className="text-[10px] tracking-[0.16em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          Enrichment Program
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section} className="mb-2">
            <div className="px-4 py-2 text-[9px] tracking-[0.18em] uppercase font-medium"
              style={{ color: 'rgba(255,255,255,0.28)' }}>
              {group.section}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link key={href} href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-5 py-2.5 text-[12.5px] font-light',
                    'border-l-2 transition-all duration-150',
                    active
                      ? 'text-white border-l-[#B8973A] bg-[rgba(184,151,58,0.08)]'
                      : 'text-white/50 border-l-transparent hover:text-white hover:bg-white/5'
                  )}>
                  <Icon size={14} className={active ? 'opacity-100' : 'opacity-60'} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 border-t border-white/8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
            style={{ background: '#8A6E25' }}>
            {profile ? getInitials(profile.full_name) : 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-white/70 truncate font-light">
              {profile?.full_name ?? 'Administrator'}
            </div>
            <div className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.32)' }}>
              {profile?.role ?? 'admin'}
            </div>
          </div>
        </div>
        <button onClick={signOut}
          className="flex items-center gap-2 text-[11px] transition-colors"
          style={{ color: 'rgba(255,255,255,0.32)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}>
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </aside>
  )
}
