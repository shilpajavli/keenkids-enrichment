'use client'

import { Bell } from 'lucide-react'
import type { Profile } from '@/types'

interface Props { profile: Profile | null }

export default function Topbar({ profile }: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-8 border-b flex-shrink-0 bg-paper"
      style={{ borderColor: 'rgba(184,151,58,0.22)' }}>
      <div />
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--ink-3)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Bell size={15} />
        </button>
        <div className="text-sm text-ink-tertiary font-light">
          {profile?.email}
        </div>
      </div>
    </header>
  )
}
