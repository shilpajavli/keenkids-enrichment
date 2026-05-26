'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatRelative } from '@/lib/utils'
import type { Announcement } from '@/types'
import { Pin, Trash2 } from 'lucide-react'

interface Parent { id: string; full_name: string; email: string; last_seen_at: string | null }
interface Program { id: string; name: string }
interface Student { id: string; parent_id: string | null; program_id: string | null }

export default function CommunityHub({ announcements: initial, parents, programs, students }: {
  announcements: Announcement[]
  parents: Parent[]
  programs: Program[]
  students: Student[]
}) {
  const [announcements, setAnnouncements] = useState(initial)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailSent, setEmailSent] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parentList, setParentList] = useState(parents)
  const [programFilter, setProgramFilter] = useState<string>('all')

  // Filter parents by selected program
  const filteredParentList = programFilter === 'all'
    ? parentList
    : parentList.filter(p => {
        const parentStudents = students.filter(s => s.parent_id === p.id)
        return parentStudents.some(s => s.program_id === programFilter)
      })

  const allSelected = selected.size === filteredParentList.length && filteredParentList.length > 0
  const selectedParents = filteredParentList.filter(p => selected.has(p.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filteredParentList.map(p => p.id)))
  }

  async function deleteParent(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Remove this parent? This will unlink them from their child.')) return
    await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' })
    setParentList(prev => prev.filter(p => p.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
    if (!message.trim() || !emailSubject.trim() || selectedParents.length === 0) return
    setSending(true)
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: emailSubject, message, emails: selectedParents.map(p => p.email) }),
    })
    const json = await res.json()
    setSending(false)
    if (json.success) {
      setEmailSent(`✓ Sent to ${json.sent} famil${json.sent === 1 ? 'y' : 'ies'}`)
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Announcement feed */}
        <div className="space-y-4">
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

        {/* Right column */}
        <div className="space-y-4">
          {/* Families chip selector */}
          <Card>
            <CardBody>
              {/* Program filter dropdown */}
              <div className="mb-3">
                <select
                  className="input text-[12px] w-full"
                  value={programFilter}
                  onChange={e => { setProgramFilter(e.target.value); setSelected(new Set()) }}>
                  <option value="all">All camps ({parentList.length} families)</option>
                  {programs.map(p => {
                    const count = parentList.filter(par =>
                      students.some(s => s.parent_id === par.id && s.program_id === p.id)
                    ).length
                    return <option key={p.id} value={p.id}>{p.name} ({count} families)</option>
                  })}
                </select>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium" style={{ color: '#4A4640' }}>
                  {selectedParents.length === filteredParentList.length && filteredParentList.length > 0
                    ? 'All families selected'
                    : `${selectedParents.length} of ${filteredParentList.length} selected`}
                </span>
                {filteredParentList.length > 0 && (
                  <button className="text-[11px]" style={{ color: '#8A6E25' }} onClick={toggleAll}>
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              {filteredParentList.length === 0 && (
                <div className="text-[12.5px]" style={{ color: '#8A8580' }}>No parents in this camp</div>
              )}
              <div className="flex flex-wrap gap-2">
                {filteredParentList.map(p => {
                  const isSelected = selected.has(p.id)
                  const initials = p.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={p.id} className="flex items-center gap-1 group/chip">
                      <div className="flex flex-col items-start">
                      <button
                        onClick={() => toggleOne(p.id)}
                        title={p.email}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[12px]"
                        style={{
                          background: isSelected ? '#EFE6CC' : '#F1EFE8',
                          border: `1.5px solid ${isSelected ? '#B8973A' : 'rgba(184,151,58,0.2)'}`,
                          color: isSelected ? '#8A6E25' : '#8A8580',
                          fontWeight: isSelected ? 500 : 400,
                        }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-shrink-0"
                          style={{ background: isSelected ? '#8A6E25' : '#C4B89A' }}>
                          {initials}
                        </div>
                        {p.full_name?.split(' ')[0]}
                      </button>
                      <span className="text-[10px] pl-3 mt-0.5" style={{ color: p.last_seen_at ? '#27500A' : '#C4B89A' }}>
                        {p.last_seen_at ? `Visited ${formatRelative(p.last_seen_at)}` : 'Never visited'}
                      </span>
                      </div>
                      <button
                        onClick={e => deleteParent(p.id, e)}
                        title="Remove parent"
                        className="opacity-0 group-hover/chip:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50"
                        style={{ color: '#8A8580' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* Email form */}
          <Card>
            <CardHeader title="Email families" />
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
                placeholder="Write a message…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ resize: 'none' }}
              />
              <button
                className="btn btn-gold text-[12px] w-full justify-center"
                onClick={sendMessage}
                disabled={sending || !emailSubject || !message || selectedParents.length === 0}>
                {sending ? 'Sending…' : `Send to ${selectedParents.length} famil${selectedParents.length === 1 ? 'y' : 'ies'}`}
              </button>
              {emailSent && <p className="text-[12px]" style={{ color: emailSent.startsWith('✓') ? '#27500A' : '#791F1F' }}>{emailSent}</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
