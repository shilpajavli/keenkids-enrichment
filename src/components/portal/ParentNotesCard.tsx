'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'

export default function ParentNotesCard({ studentId, notes: initial }: { studentId: string; notes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initial ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    await fetch('/api/student-info', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, parent_notes: notes.trim() || null }),
    })
    setSaving(false)
    setSaved(true)
    setEditing(false)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-serif text-[15px] font-light" style={{ color: '#1A1814' }}>Notes to Admin</div>
            <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
              Start date, schedule changes, anything we should know
            </div>
          </div>
          {!editing && (
            <button className="text-[11px]" style={{ color: '#8A6E25' }} onClick={() => setEditing(true)}>
              {notes ? 'Edit' : 'Add note'}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              className="w-full text-[13px] rounded-lg px-3 py-2 resize-none outline-none"
              style={{ border: '1.5px solid rgba(184,151,58,0.3)', background: '#FDFCF9', color: '#1A1814', minHeight: 80 }}
              placeholder="e.g. Joining from Oct 15, starting mid-week, 3-day plan…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="btn btn-gold text-[12px] py-1.5" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn text-[12px] py-1.5" style={{ color: '#8A8580' }} onClick={() => { setNotes(initial ?? ''); setEditing(false) }}>
                Cancel
              </button>
            </div>
          </div>
        ) : notes ? (
          <div className="rounded-xl p-3" style={{ background: '#FFF9EC', border: '1px solid rgba(184,151,58,0.25)' }}>
            <p className="text-[13px]" style={{ color: '#4A4640' }}>{notes}</p>
          </div>
        ) : (
          <p className="text-[12.5px]" style={{ color: '#B8B4B0' }}>No notes added yet.</p>
        )}

        {saved && <p className="text-[12px] mt-2" style={{ color: '#27500A' }}>✓ Saved</p>}
      </CardBody>
    </Card>
  )
}
