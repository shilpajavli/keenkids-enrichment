'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatDate, formatRelative } from '@/lib/utils'
import type { Announcement } from '@/types'
import { Pin, Trash2 } from 'lucide-react'

const TESTIMONIALS = [
  { initials: 'LF', name: 'Lee family',      text: '"Aiden comes home excited every single week!"' },
  { initials: 'MF', name: 'Martinez family', text: '"Sofia\'s confidence has grown tremendously."' },
  { initials: 'TF', name: 'Thompson family', text: '"Kai built his first game — we were blown away!"' },
]

interface Parent { id: string; full_name: string; email: string }

export default function CommunityHub({ announcements: initial, parents }: { announcements: Announcement[]; parents: Parent[] }) {
  const [announcements, setAnnouncements] = useState(initial)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailSent, setEmailSent] = useState('')

  async function postAnnouncement() {
    if (!title.trim() || !body.trim()) return
    setPosting(true)
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, pinned }),
    })
    const { data } = await res.json()
    if (data) setAnnouncements(prev => [data, ...prev])
    setTitle('')
    setBody('')
    setPinned(false)
    setPosting(false)
  }

  async function deleteAnnouncement(id: string) {
    await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  async function sendMessage() {
    if (!message.trim() || !emailSubject.trim()) return
    setSending(true)
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: emailSubject, message }),
    })
    const json = await res.json()
    setSending(false)
    if (json.success) {
      setEmailSent(`✓ Sent to ${json.sent} families`)
      setMessage('')
      setEmailSubject('')
    } else {
      setEmailSent(`Error: ${json.error}`)
    }
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex gap-3">
        <button className="btn btn-ink text-[12.5px]" onClick={() => document.getElementById('new-ann')?.scrollIntoView({ behavior: 'smooth' })}>
          + New announcement
        </button>
        <button className="btn text-[12.5px]">Weekly newsletter →</button>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Announcement feed */}
        <div className="space-y-4">
          {/* Post form */}
          <Card id="new-ann">
            <CardHeader title="Post announcement" />
            <CardBody className="space-y-3">
              <input
                className="input text-[13px]"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                className="input text-[13px]"
                rows={3}
                placeholder="Write your announcement…"
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ resize: 'none' }}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: '#4A4640' }}>
                  <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
                  Pin to top
                </label>
                <button className="btn btn-gold text-[12px]" onClick={postAnnouncement} disabled={posting}>
                  {posting ? 'Posting…' : 'Post to all families'}
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Announcements list */}
          {announcements.map(ann => (
            <Card key={ann.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {ann.pinned && <Pin size={11} style={{ color: '#B8973A' }} />}
                      <div className="font-serif text-[16px] font-light">{ann.title}</div>
                    </div>
                    <div className="text-[12.5px] leading-relaxed mb-2" style={{ color: '#4A4640' }}>{ann.body}</div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>{formatRelative(ann.created_at)}</div>
                  </div>
                  <button onClick={() => deleteAnnouncement(ann.id)}
                    className="text-[#8A8580] hover:text-[#791F1F] transition-colors mt-0.5 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}

          {announcements.length === 0 && (
            <div className="py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>No announcements yet</div>
          )}
        </div>

        {/* Right column: parents + message */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={`Families (${parents.length})`} />
            <CardBody className="p-0">
              {parents.length === 0 && (
                <div className="px-5 py-4 text-[12.5px]" style={{ color: '#8A8580' }}>No parents linked yet</div>
              )}
              {parents.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < parents.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                    style={{ background: '#8A6E25' }}>
                    {p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium truncate">{p.full_name}</div>
                    <div className="text-[11px] truncate" style={{ color: '#8A8580' }}>{p.email}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parent voices" />
            <CardBody className="p-0">
              {TESTIMONIALS.map((t, i) => (
                <div key={t.name} className="flex items-start gap-3 px-5 py-4"
                  style={{ borderBottom: i < TESTIMONIALS.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                    style={{ background: '#EFE6CC', color: '#8A6E25' }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium mb-0.5">{t.name}</div>
                    <div className="text-[12px] italic leading-relaxed" style={{ color: '#4A4640' }}>{t.text}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Email all families" />
            <CardBody className="space-y-3">
              <input
                className="input text-[13px]"
                placeholder="Subject line"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
              <textarea
                className="input text-[13px]"
                rows={4}
                placeholder="Write a message to all parents…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ resize: 'none' }}
              />
              <button className="btn btn-gold text-[12px] w-full justify-center" onClick={sendMessage} disabled={sending || !emailSubject || !message || parents.length === 0}>
                {sending ? 'Sending…' : `Send to ${parents.length} famil${parents.length === 1 ? 'y' : 'ies'}`}
              </button>
              {emailSent && <p className="text-[12px]" style={{ color: emailSent.startsWith('✓') ? '#27500A' : '#791F1F' }}>{emailSent}</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
