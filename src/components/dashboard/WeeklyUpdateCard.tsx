'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'

interface Props {
  schoolId: string
  weekOf: string
  initial: { message: string; author_name: string | null; updated_at: string } | null
}

export default function WeeklyUpdateCard({ schoolId, weekOf, initial }: Props) {
  const [editing, setEditing] = useState(!initial)
  const [message, setMessage] = useState(initial?.message ?? '')
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!message.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/weekly-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, week_of: weekOf, message }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      setSaved(json.data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const formattedDate = saved?.updated_at
    ? new Date(saved.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })
    : null

  return (
    <Card>
      <CardHeader
        title="This week's class update"
        action={
          !editing && saved ? (
            <button onClick={() => { setMessage(saved.message); setEditing(true) }}
              className="text-[11px]" style={{ color: '#B8973A' }}>Edit →</button>
          ) : null
        }
      />
      <CardBody>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Share what the class worked on this week — highlights, activities, what the kids loved…"
              className="w-full rounded-lg border px-3 py-2 text-[13px] leading-relaxed resize-none focus:outline-none focus:ring-1"
              style={{
                borderColor: 'rgba(184,151,58,0.35)',
                background: '#FAF7F2',
                color: '#1A1814',
              }}
            />
            {error && <p className="text-[12px]" style={{ color: '#791F1F' }}>{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !message.trim()}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-50"
                style={{ background: '#1A1814', color: 'white' }}
              >
                {saving ? 'Saving…' : 'Save update'}
              </button>
              {saved && (
                <button onClick={() => setEditing(false)}
                  className="px-4 py-1.5 rounded-lg text-[12px]"
                  style={{ color: '#8A8580' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : saved ? (
          <div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#1A1814' }}>{saved.message}</p>
            {formattedDate && (
              <p className="text-[11px] mt-3" style={{ color: '#8A8580' }}>
                Last updated {formattedDate}{saved.author_name ? ` by ${saved.author_name}` : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: '#8A8580' }}>No update posted yet for this week.</p>
        )}
      </CardBody>
    </Card>
  )
}
