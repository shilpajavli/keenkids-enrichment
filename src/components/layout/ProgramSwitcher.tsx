'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus } from 'lucide-react'

interface Program { id: string; name: string; location: string | null }

export default function ProgramSwitcher({ programs, currentId }: { programs: Program[]; currentId: string | null }) {
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const current = programs.find(p => p.id === currentId) ?? programs[0]

  async function selectProgram(id: string) {
    await fetch('/api/programs/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program_id: id }),
    })
    setOpen(false)
    router.refresh()
  }

  async function createProgram() {
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), location: location.trim() || null }),
    })
    const { data } = await res.json()
    setCreating(false)
    if (data) {
      await selectProgram(data.id)
      setShowNew(false)
      setName('')
      setLocation('')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-colors"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
        <span className="truncate">{current?.name ?? 'Select program'}</span>
        <ChevronDown size={12} className="flex-shrink-0 ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg overflow-hidden shadow-xl z-50"
            style={{ background: '#2A2520', border: '1px solid rgba(255,255,255,0.1)' }}>
            {programs.map(p => (
              <button key={p.id} onClick={() => selectProgram(p.id)}
                className="w-full text-left px-3 py-2.5 text-[12px] transition-colors hover:bg-white/5"
                style={{ color: p.id === (currentId ?? programs[0]?.id) ? '#B8973A' : 'rgba(255,255,255,0.7)' }}>
                {p.name}
                {p.location && <span className="block text-[10px] opacity-50">{p.location}</span>}
              </button>
            ))}

            {showNew ? (
              <div className="p-2 space-y-1.5 border-t border-white/10">
                <input
                  className="w-full rounded px-2 py-1.5 text-[11px] text-white placeholder-white/30 outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}
                  placeholder="Program name (e.g. Mattos 5-Week)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
                <input
                  className="w-full rounded px-2 py-1.5 text-[11px] text-white placeholder-white/30 outline-none"
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}
                  placeholder="Location (optional)"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
                <div className="flex gap-1">
                  <button onClick={createProgram} disabled={!name || creating}
                    className="flex-1 py-1.5 rounded text-[11px] font-medium transition-opacity"
                    style={{ background: '#B8973A', color: 'white', opacity: !name || creating ? 0.5 : 1 }}>
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setShowNew(false)}
                    className="px-3 py-1.5 rounded text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNew(true)}
                className="w-full flex items-center gap-1.5 px-3 py-2.5 text-[11px] border-t transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <Plus size={11} /> New program
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
