'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MediaItem } from '@/types'

export default function MediaGrid({ items }: { items: MediaItem[] }) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>
        No photos or videos yet
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {items.map(item => (
          <div key={item.id}
            className="rounded-xl overflow-hidden cursor-pointer group"
            style={{ border: '1px solid rgba(184,151,58,0.24)', aspectRatio: '4/3', position: 'relative', background: '#F5F0E8' }}
            onClick={() => setLightbox(item)}>
            {item.type === 'photo' && item.url ? (
              <Image src={item.url} alt={item.caption ?? ''} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: '#8A8580' }}>
                <Play size={24} style={{ opacity: 0.4 }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#B8973A' }}>Video</span>
              </div>
            )}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end"
              style={{ background: 'linear-gradient(to top, rgba(26,24,20,0.55) 0%, transparent 60%)' }}>
              <div className="p-2.5 text-white text-[11px]">
                {formatDate(item.created_at, 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(26,24,20,0.92)' }}
          onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-5 text-white/60 hover:text-white"
            onClick={() => setLightbox(null)}>
            <X size={22} />
          </button>
          <div className="max-w-2xl w-full mx-6" onClick={e => e.stopPropagation()}>
            {lightbox.type === 'photo' && lightbox.url
              ? <Image src={lightbox.url} alt="" width={800} height={533} className="w-full rounded-xl" />
              : <video src={lightbox.url} controls className="w-full rounded-xl" />
            }
          </div>
        </div>
      )}
    </>
  )
}
