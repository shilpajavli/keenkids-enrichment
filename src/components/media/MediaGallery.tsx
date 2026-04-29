'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, Play, Trash2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { MediaItem } from '@/types'
import { createClient } from '@/lib/supabase-browser'

interface StudentOption { id: string; full_name: string }
interface Props { media: MediaItem[]; students: StudentOption[] }

interface UploadItem {
  name: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
}

export default function MediaGallery({ media: initialMedia, students }: Props) {
  const [media, setMedia] = useState(initialMedia)
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [studentFilter, setStudentFilter] = useState('all')
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)
  const [uploadStudent, setUploadStudent] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])

  const onDrop = useCallback(async (files: File[]) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Initialize queue
    const queue: UploadItem[] = files.map(f => ({ name: f.name, status: 'pending', progress: 0 }))
    setUploadQueue(queue)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isVideo = file.type.startsWith('video/')
      const bucket = isVideo ? 'Videos' : 'Photos'
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${i}.${ext}`

      // Mark as uploading
      setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, status: 'uploading', progress: 10 } : item))

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0 } : item))
        continue
      }

      setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, progress: 80 } : item))

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      const res = await fetch('/api/media/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlData.publicUrl,
          type: isVideo ? 'video' : 'photo',
          student_id: uploadStudent || null,
          caption: uploadCaption || null,
        }),
      })
      const { data } = await res.json()
      if (data) setMedia(prev => [data, ...prev])

      setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, status: 'done', progress: 100 } : item))
    }
  }, [uploadStudent, uploadCaption])

  async function deleteItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this photo/video?')) return
    setDeleting(id)
    await fetch(`/api/media?id=${id}`, { method: 'DELETE' })
    setMedia(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  const filtered = media.filter(m => {
    const matchType = filter === 'all' || m.type === filter
    const matchStudent = studentFilter === 'all' || m.student_id === studentFilter
    return matchType && matchStudent
  })

  const lightboxIndex = lightbox ? filtered.findIndex(m => m.id === lightbox.id) : -1

  function goNext() {
    if (lightboxIndex < filtered.length - 1) setLightbox(filtered[lightboxIndex + 1])
  }
  function goPrev() {
    if (lightboxIndex > 0) setLightbox(filtered[lightboxIndex - 1])
  }

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, lightboxIndex, filtered])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'video/mp4': [], 'video/quicktime': [], 'video/x-msvideo': [] },
    maxSize: 200 * 1024 * 1024,
    multiple: true,
  })

  const allDone = uploadQueue.length > 0 && uploadQueue.every(u => u.status === 'done' || u.status === 'error')

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
          <button className="btn btn-gold text-[12px]" onClick={() => { setShowUploadPanel(p => !p); setUploadQueue([]) }}>
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

            {/* Drop zone */}
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
                {isDragActive ? 'Drop to upload' : 'Drag photos or videos here, or click to browse'}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: '#8A8580' }}>
                Select multiple files at once · JPEG, PNG, MP4, MOV · Max 200MB per file
              </div>
            </div>

            {/* Upload progress */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                {uploadQueue.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] truncate" style={{ color: '#4A4640' }}>{item.name}</span>
                        {item.status === 'done' && <CheckCircle2 size={14} style={{ color: '#27500A' }} />}
                        {item.status === 'error' && <AlertCircle size={14} style={{ color: '#791F1F' }} />}
                        {item.status === 'uploading' && <span className="text-[11px]" style={{ color: '#8A8580' }}>Uploading…</span>}
                        {item.status === 'pending' && <span className="text-[11px]" style={{ color: '#8A8580' }}>Waiting…</span>}
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0EBE0' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.progress}%`,
                            background: item.status === 'error' ? '#791F1F' : item.status === 'done' ? '#27500A' : '#B8973A',
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
                {allDone && (
                  <button className="text-[12px] mt-1" style={{ color: '#8A6E25' }}
                    onClick={() => { setUploadQueue([]); setShowUploadPanel(false) }}>
                    ✓ All done — close panel
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Grid */}
      {filtered.length === 0 && (
        <div className="py-16 text-center text-[13px]" style={{ color: '#8A8580' }}>No media uploaded yet</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id}
            className="rounded-xl overflow-hidden cursor-pointer group transition-all"
            style={{ border: '1px solid rgba(184,151,58,0.28)' }}
            onClick={() => setLightbox(item)}>
            <div className="relative w-full overflow-hidden"
              style={{ aspectRatio: '4/3', background: '#1A1814' }}>
              {item.url && item.type === 'photo' ? (
                <Image src={item.url} alt={item.caption ?? ''} fill className="object-contain" />
              ) : item.url ? (
                <>
                  <video
                    src={`${item.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(26,24,20,0.55)' }}>
                      <Play size={16} className="text-white" style={{ marginLeft: 2 }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 absolute inset-0 flex items-center justify-center" style={{ color: '#8A8580' }}>
                  <Play size={28} style={{ opacity: 0.4 }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: '#B8973A' }}>Video</span>
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ background: 'rgba(26,24,20,0.25)' }}>
                <div className="text-white text-[12px]">View</div>
              </div>
              <button onClick={e => deleteItem(item.id, e)} disabled={deleting === item.id}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full"
                style={{ background: 'rgba(26,24,20,0.7)' }}>
                <Trash2 size={12} className="text-white" />
              </button>
            </div>
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
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          style={{ background: 'rgba(26,24,20,0.95)' }}
          onClick={() => setLightbox(null)}>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10">
            <div className="text-white/40 text-[12px] tabular-nums">{lightboxIndex + 1} / {filtered.length}</div>
            <button className="text-white/60 hover:text-white transition-colors" onClick={() => setLightbox(null)}>
              <X size={22} />
            </button>
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={e => { e.stopPropagation(); goPrev() }}>
              <ChevronLeft size={22} className="text-white" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < filtered.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={e => { e.stopPropagation(); goNext() }}>
              <ChevronRight size={22} className="text-white" />
            </button>
          )}

          {/* Media — centred, never overflows */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ padding: '56px 64px 20px' }}
            onClick={e => e.stopPropagation()}>
            {lightbox.type === 'photo' && lightbox.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt={lightbox.caption ?? ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 130px)',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 12,
                  display: 'block',
                  flexShrink: 0,
                }}
              />
            ) : (
              <video
                src={lightbox.url}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 130px)',
                  borderRadius: 12,
                  flexShrink: 0,
                }}
              />
            )}
            {(lightbox.caption || lightbox.student?.full_name) && (
              <div className="text-center flex-shrink-0">
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
