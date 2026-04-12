import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

const ATTEND_BADGE: Record<string, any> = {
  present: 'green', late: 'amber', absent: 'red',
}

const DATE_MAP: Record<string, string> = {
  'Bio-Engineering':           'Mon · Apr 13',
  'Cargo & Balance':           'Tue · Apr 14',
  'Solar Optics':              'Wed · Apr 15',
  'Aerodynamics & Wind Power': 'Thu · Apr 16',
  'Global Engineering Summit': 'Fri · Apr 17',
}

export default async function ParentPortalPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', user.id)
    .single()

  if (!student) {
    return (
      <div className="text-center py-16">
        <h2 className="font-serif text-2xl font-light text-ink mb-2">No student linked yet</h2>
        <p className="text-ink-tertiary text-sm">Please contact your program administrator to link your child's account.</p>
      </div>
    )
  }

  const [attendanceRes, mediaRes, paymentsRes, announcementsRes, skillsRes] = await Promise.all([
    supabase.from('attendance').select('*, class:classes(name)').eq('student_id', student.id).order('date', { ascending: false }).limit(10),
    supabase.from('media').select('*').or(`student_id.eq.${student.id},student_id.is.null`).order('created_at', { ascending: false }).limit(12),
    supabase.from('payments').select('*').eq('parent_id', user.id).order('due_date', { ascending: false }),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('student_skills').select('*, skill:skills(*)').eq('student_id', student.id),
  ])

  const attendance = attendanceRes.data ?? []
  const media = mediaRes.data ?? []
  const payments = paymentsRes.data ?? []
  const announcements = announcementsRes.data ?? []
  const skills = skillsRes.data ?? []

  const subjects = [...new Set(skills.map(s => s.skill?.subject).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium text-white flex-shrink-0"
          style={{ background: '#8A6E25' }}>
          {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-serif text-2xl font-light" style={{ color: '#1A1814' }}>{student.full_name}</h1>
          <Badge variant="blue">{student.grade === 0 ? 'TK/K' : `Grade ${student.grade}`}</Badge>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader title="Announcements" />
          <CardBody className="p-0">
            {announcements.map((ann, i) => (
              <div key={ann.id} className="px-5 py-4"
                style={{ borderBottom: i < announcements.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div className="flex items-center gap-2 mb-1">
                  {ann.pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: '#EFE6CC', color: '#8A6E25' }}>Pinned</span>
                  )}
                  <div className="font-serif text-[15px] font-light">{ann.title}</div>
                </div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: '#4A4640' }}>{ann.body}</div>
                <div className="text-[11px] mt-2" style={{ color: '#8A8580' }}>
                  {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Schedule */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader title="This week's schedule" />
          <CardBody className="p-0">
            {subjects.map((subject, si) => {
              const date = subject ? DATE_MAP[subject] : null
              return (
                <div key={subject} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: si < subjects.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <span className="text-[13px] font-medium">{subject}</span>
                  {date && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: '#EFE6CC', color: '#8A6E25' }}>{date}</span>
                  )}
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      {/* Attendance */}
      {attendance.length > 0 && (
        <Card>
          <CardHeader title="Attendance" />
          <CardBody className="p-0">
            {attendance.map((rec, i) => (
              <div key={rec.id} className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: i < attendance.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div>
                  <div className="text-[12.5px] font-medium">{formatDate(rec.date)}</div>
                  <div className="text-[11px]" style={{ color: '#8A8580' }}>
                    {Array.isArray(rec.class) ? rec.class[0]?.name : (rec.class as any)?.name}
                  </div>
                </div>
                <Badge variant={ATTEND_BADGE[rec.status]}>{rec.status}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Photos */}
      {media.length > 0 && (
        <Card>
          <CardHeader title="Photos & videos from class" />
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {media.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden aspect-square bg-paper">
                  {item.type === 'photo' ? (
                    <img src={item.url} alt={item.caption ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px]"
                      style={{ color: '#B8973A' }}>▶ Video</div>
                  )}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader title="Payments" />
          <CardBody className="p-0">
            {payments.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: i < payments.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div>
                  <div className="text-[12.5px] font-medium">${(p.amount_cents / 100).toFixed(2)}</div>
                  <div className="text-[11px]" style={{ color: '#8A8580' }}>Due {formatDate(p.due_date)}</div>
                </div>
                <Badge variant={p.status === 'paid' ? 'green' : p.status === 'overdue' ? 'red' : 'amber'}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
