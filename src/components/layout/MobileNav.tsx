'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CalendarCheck, MessageCircle } from 'lucide-react'

const NAV = [
  { href: '/dashboard',            label: 'Home',       icon: LayoutDashboard },
  { href: '/dashboard/students',   label: 'Students',   icon: Users },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/dashboard/community',  label: 'Community',  icon: MessageCircle },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-50"
      style={{ background: '#1A1814', borderColor: 'rgba(255,255,255,0.08)' }}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
            style={{ color: active ? '#B8973A' : 'rgba(255,255,255,0.4)' }}>
            <Icon size={20} />
            <span style={{ fontSize: '10px' }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
