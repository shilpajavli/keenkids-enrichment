'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, Play, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { MediaItem } from '@/types'

interface StudentOption { id: string; full_name: string }

interface Props {
  media: MediaItem[]
  students: StudentOption[]
}

export default function MediaGallery({ media: initialMedia, students }: Props) {
  const [media, setMedia] = useState(initialMedia)
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [studentFilter, setStudentFilter] = useState('all')
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStudent, setUploadStudent] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      if (uploadStudent) fd.append('student_id', uploadStudent)
      if (uploadCaption) fd.append('caption', uploadCaption)
      const res = await fetch('/api/media', { method: 'POST', body: fd })
      const { data } = await res.json()
      if (data) setMedia(prev => [data, ...prev])
    }
    setUploading(false)
    setShowUploadPanel(false)
  }, [uploadStudent, uploadCaption])

  async function deleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this photo/video?')) return
    setDeleting(id)
    await fetch(`/api/media?id=${id}`, { method: 'DELETE' })
    setMedia(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxSize: 50 * 1024 * 1024,
  })

  const filtered = media.filter(m => {
    const matchType = filter === 'all' || m.type === filter
    const matchStudent = studentFilter === 'all' || m.student_id === studentFilter
    return matchType && matchStudent
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <select className="input w-auto text-[12.5px]" value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option value="all">All types</option>
          <option value="photo">Photos only</option>
          <option value="video">Videos only</option>
        </select>
        <select className="input w-auto text-[12.5px]" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
          <option value="all">All students</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px]" style={{ color: '#8A8580' }}>{filtered.length} items</span>
          <button className="btn btn-gold text-[12px]" onClick={() => setShowUploadPanel(p => !p)}>
            <Upload size={13} /> Upload media
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUploadPanel && (
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <select className="input w-auto text-[12.5px]" value={uploadStudent} onChange={e => setUploadStudent(e.target.value)}>
                <option value="">Tag a student (optional)</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <input className="input text-[12.5px]" placeholder="Caption (optional)" value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} />
            </div>
            <div
              {...getRootProps()}
              className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
              style={{
                borderColor: isDragActive ? '#B8973A' : 'rgba(184,151,58,0.32)',
                background: isDragActive ? '#EFE6CC' : 'transparent',
              }}>
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-3" size={28} style={{ color: '#B8973A', opacity: 0.6 }} />
              <div className="text-[13px]" style={{ color: '#4A4640' }}>
                {uploading ? 'Uploading…' : isDragActive ? 'Drop to upload' : 'Drag photos or videos here, or click to browse'}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: '#8A8580' }}>JPEG, PNG, MP4, MOV · Max 50MB per file</div>
            </div>
          </div>
        </Card>
      )}

      {/* Grid */}
      {filtered.length === 0 && (
        <div className="py-16 text-center text-[13px]" style={{ color: '#8A8580' }}>
          No media uploaded yet
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {filtered.map(item => (
          <div key={item.id}
            className="rounded-xl overflow-hidden cursor-pointer group transition-all"
            style={{ border: '1px solid rgba(184,151,58,0.28)' }}
            onClick={() => setLightbox(item)}>
            {/* Thumbnail */}
            <div className="relative w-full flex items-center justify-center"
              style={{ aspectRatio: '4/3', background: '#F5F0E8' }}>
              {item.url && item.type === 'photo' ? (
                <Image src={item.url} alt={item.caption ?? ''} fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: '#8A8580' }}>
                  <Play size={28} style={{ opacity: 0.4 }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: '#B8973A' }}>Video</span>
                </div>
              )}
              {item.type === 'video' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] text-white"
                  style={{ background: 'rgba(26,24,20,0.7)' }}>
                  {item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)}:${String(item.duration_seconds % 60).padStart(2, '0')}` : 'Video'}
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ background: 'rgba(26,24,20,0.25)' }}>
                <div className="text-white text-[12px]">View</div>
              </div>
              <button
                onClick={e => deleteItem(item.id, e)}
                disabled={deleting === item.id}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full"
                style={{ background: 'rgba(26,24,20,0.7)' }}>
                <Trash2 size={12} className="text-white" />
              </button>
            </div>
            {/* Meta */}
            <div className="p-3 bg-white">
              <div className="text-[12.5px] font-medium" style={{ color: '#1A1814' }}>
                {item.caption ?? (item.type === 'photo' ? 'Photo' : 'Video')}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                {item.student?.full_name ?? 'Group'} · {formatDate(item.created_at, 'MMM d')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(26,24,20,0.92)' }}
          onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          <div className="relative max-w-3xl max-h-[80vh] w-full mx-6"
            onClick={e => e.stopPropagation()}>
            {lightbox.type === 'photo' && lightbox.url ? (
              <Image src={lightbox.url} alt={lightbox.caption ?? ''} width={900} height={600}
                className="w-full h-auto rounded-xl object-contain" />
            ) : (
              <video src={lightbox.url} controls className="w-full rounded-xl" />
            )}
            {(lightbox.caption || lightbox.student?.full_name) && (
              <div className="mt-3 text-center">
                {lightbox.caption && <div className="text-white text-sm">{lightbox.caption}</div>}
                {lightbox.student?.full_name && (
                  <div className="text-white/50 text-xs mt-1">{lightbox.student.full_name} · {formatDate(lightbox.created_at)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
