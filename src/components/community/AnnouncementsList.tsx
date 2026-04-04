import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatRelative } from '@/lib/utils'
import type { Announcement } from '@/types'

export default function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  return (
    <Card>
      <CardHeader
        title="Announcements"
        action={
          <Link href="/dashboard/community"
            className="btn btn-gold text-[11.5px] py-1.5">
            + Post
          </Link>
        }
      />
      <CardBody className="p-0">
        {announcements.length === 0 && (
          <div className="py-10 text-center text-[13px]" style={{ color: '#8A8580' }}>No announcements yet</div>
        )}
        {announcements.map((ann, i) => (
          <div key={ann.id} className="px-5 py-4"
            style={{ borderBottom: i < announcements.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
            <div className="flex items-start gap-2">
              {ann.pinned && (
                <span className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0"
                  style={{ background: '#EFE6CC', color: '#8A6E25' }}>Pinned</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[15px] font-light mb-1">{ann.title}</div>
                <div className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#4A4640' }}>
                  {ann.body}
                </div>
                <div className="text-[11px] mt-2" style={{ color: '#8A8580' }}>
                  {formatRelative(ann.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(184,151,58,0.14)' }}>
          <Link href="/dashboard/community" className="text-[12px] transition-colors"
            style={{ color: '#B8973A' }}>
            View all announcements →
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
