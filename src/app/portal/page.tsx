import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { CurriculumItem } from '@/types'

const ATTEND_BADGE: Record<string, any> = {
  present: 'green', late: 'amber', absent: 'red',
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const STRIPE_LINKS: Record<string, string> = {
  '5_day': 'https://buy.stripe.com/fZu3co3pf6zT1MHg1me3e02',
  '3_day': 'https://buy.stripe.com/14A28k1h7aQ9dvp6qMe3e04',
  '1_day': 'https://buy.stripe.com/3cIcMYbVLf6p8b57uQe3e03',
}
const MATERIAL_FEE_LINK = 'https://buy.stripe.com/bJeeV6aRHgatbnhaH2e3e00'

function getMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(weekOf: string): string {
  const date = new Date(weekOf + 'T00:00:00')
  const endDate = new Date(date)
  endDate.setDate(date.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${date.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`
}

export default async function ParentPortalPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: student } = await supabase
    .from('students')
    .select('*, school:schools(*)')
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

  const currentWeek = getMonday()

  const [attendanceRes, mediaRes, paymentsRes, announcementsRes, curriculumRes] = await Promise.all([
    supabase.from('attendance').select('*, class:classes(name)').eq('student_id', student.id).order('date', { ascending: false }).limit(10),
    supabase.from('media').select('*').or(`student_id.eq.${student.id},student_id.is.null`).order('created_at', { ascending: false }).limit(12),
    supabase.from('payments').select('*').eq('student_id', student.id).order('due_date', { ascending: false }),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    student.school_id 
      ? supabase.from('curriculum').select('*').eq('school_id', student.school_id).eq('week_of', currentWeek).single()
      : Promise.resolve({ data: null }),
  ])

  const attendance = attendanceRes.data ?? []
  const media = mediaRes.data ?? []
  const payments = paymentsRes.data ?? []
  const announcements = announcementsRes.data ?? []
  const curriculum = curriculumRes.data

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
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="blue">{student.grade === 0 ? 'K' : `Grade ${student.grade}`}</Badge>
            {student.school && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" 
                style={{ background: '#E8E4F8', color: '#5B4B8A' }}>
                {student.school.name}
              </span>
            )}
            {student.enrollment_type && student.enrollment_type !== '5_day' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full" 
                style={{ background: '#FEF3C7', color: '#92400E' }}>
                {student.enrollment_type.replace('_', '-')} program
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader title="Weekly Schedule" />
        <CardBody className="p-0">
          {[
            { day: 'Monday', emoji: '🔧', theme: 'STEAM Build Day', sub: 'Engineering & Design', desc: 'Hands-on engineering and creative builds that inspire young innovators!', bullets: ['Design', 'Build', 'Test', 'Improve'], tagline: 'BUILD IDEAS. BUILD CONFIDENCE.' },
            { day: 'Tuesday', emoji: '💻', theme: 'Coding & Technology', sub: 'Scratch (G2–6) · ScratchJr (G1–2)', desc: 'Learn coding through fun animation, games and interactive projects!', bullets: ['Build stories & games', 'Animate characters', 'Solve problems', 'Think creatively'], tagline: 'CODE TODAY. CREATE TOMORROW.' },
            { day: 'Wednesday', emoji: '🎤', theme: 'Public Speaking & Communication', sub: 'Confidence Building', desc: 'Build confidence, express ideas and become strong communicators!', bullets: ['Speak with confidence', 'Share ideas', 'Listen & connect', 'Lead with impact'], tagline: 'SPEAK UP. STAND OUT.' },
            { day: 'Thursday', emoji: '🧪', theme: 'Science Lab & Experiments', sub: 'Hands-on Discovery', desc: 'Explore the world of science through exciting experiments and real discoveries!', bullets: ['Fun experiments', 'Ask questions', 'Make observations', 'Discover science'], tagline: 'EXPLORE SCIENCE. DISCOVER POSSIBILITIES.' },
            { day: 'Friday', emoji: '🎨', theme: 'Free Exploration Station', sub: 'Open Creative Time', desc: 'A creative open station where kids can create, build and explore their own ideas!', bullets: ['Create freely', 'Build & design', 'Explore materials', 'Imagine & innovate'], tagline: 'EXPLORE FREELY. CREATE FEARLESSLY.' },
          ].map((d, i, arr) => (
            <div key={d.day} className="px-5 py-4" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0 mt-0.5">{d.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[13px]" style={{ color: '#B8973A' }}>{d.day}</span>
                    <span className="text-[12px] font-semibold" style={{ color: '#1A1814' }}>{d.theme}</span>
                  </div>
                  <div className="text-[11px] mb-1" style={{ color: '#8A8580' }}>{d.sub}</div>
                  <div className="text-[12.5px] mb-2" style={{ color: '#4A4640' }}>{d.desc}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2">
                    {d.bullets.map(b => (
                      <span key={b} className="text-[11.5px]" style={{ color: '#5B4B8A' }}>● {b}</span>
                    ))}
                  </div>
                  <div className="text-[10px] tracking-[0.12em] font-semibold" style={{ color: '#8A6E25' }}>{d.tagline}</div>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* What Kids Build */}
      <Card>
        <CardHeader title="What Kids Build" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '🧠', title: 'Build Skills', desc: 'Critical thinking, problem solving & creativity' },
              { emoji: '🎤', title: 'Speak Confidently', desc: 'Public speaking, teamwork & self-expression' },
              { emoji: '🔬', title: 'Explore & Discover', desc: 'Hands-on experiments that make learning exciting' },
              { emoji: '💡', title: 'Innovate & Create', desc: 'Design, build and bring ideas to life' },
            ].map(item => (
              <div key={item.title} className="rounded-lg p-3" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
                <div className="text-xl mb-1">{item.emoji}</div>
                <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#1A1814' }}>{item.title}</div>
                <div className="text-[11px]" style={{ color: '#4A4640' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Monthly Themes */}
      <Card>
        <CardHeader title="Monthly Themes · Aug 2026 – May 2027" />
        <CardBody className="p-0">
          {[
            { month: 'August 2026', emoji: '🚗', theme: 'Motion & Transportation' },
            { month: 'September 2026', emoji: '✈️', theme: 'Air & Flight' },
            { month: 'October 2026', emoji: '🧙', theme: 'Spooky Science' },
            { month: 'November 2026', emoji: '⚙️', theme: 'Engineering Machines' },
            { month: 'December 2026', emoji: '🏔️', theme: 'Winter Builders' },
            { month: 'January 2027', emoji: '🪐', theme: 'Space Explorers' },
            { month: 'February 2027', emoji: '💡', theme: 'Electricity & Light' },
            { month: 'March 2027', emoji: '🌱', theme: 'Nature Engineers' },
            { month: 'April 2027', emoji: '🤖', theme: 'Robotics & Coding' },
            { month: 'May 2027', emoji: '🏆', theme: 'Inventor Challenge Month' },
          ].map((m, i, arr) => (
            <div key={m.month} className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
              <span className="text-lg">{m.emoji}</span>
              <div>
                <div className="text-[11px]" style={{ color: '#8A8580' }}>{m.month}</div>
                <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{m.theme}</div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

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

      {/* Curriculum for this week */}
      {curriculum && (
        <Card>
          <CardHeader 
            title={curriculum.title} 
            action={<span className="text-[11px]" style={{ color: '#8A8580' }}>{formatWeekLabel(curriculum.week_of)}</span>}
          />
          <CardBody>
            {curriculum.description && (
              <p className="text-[13px] mb-4" style={{ color: '#4A4640' }}>{curriculum.description}</p>
            )}
            <div className="space-y-1">
              {DAYS.map(day => {
                const dayItems = ((curriculum.content ?? []) as CurriculumItem[]).filter(item => item.day === day)
                if (dayItems.length === 0) return null
                return (
                  <div key={day} className="flex gap-4 py-3" style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                    <div className="w-24 text-[12px] font-medium" style={{ color: '#B8973A' }}>{day}</div>
                    <div className="flex-1 space-y-1">
                      {dayItems.map((item, i) => (
                        <div key={i}>
                          <span className="text-[13px] font-medium">{item.subject}</span>
                          {item.activity && <span className="text-[13px]" style={{ color: '#4A4640' }}> — {item.activity}</span>}
                          {item.materials && <span className="text-[11px] ml-2 px-1.5 py-0.5 rounded" style={{ background: '#F5F0E8', color: '#8A8580' }}>{item.materials}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {!curriculum && student.school && (
        <Card>
          <CardHeader title="This Week's Curriculum" />
          <CardBody>
            <p className="text-[13px] text-center py-4" style={{ color: '#8A8580' }}>
              No curriculum has been posted for this week yet.
            </p>
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

      {/* Photos & Videos */}
      {media.length > 0 && (
        <Card>
          <CardHeader title="Photos & videos from class" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {media.map(item => (
                <div key={item.id} className="rounded-lg overflow-hidden"
                  style={{ background: '#1A1814', border: '1px solid rgba(184,151,58,0.2)' }}>
                  {item.type === 'photo' ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={item.url} alt={item.caption ?? ''}
                        className="w-full"
                        style={{ display: 'block', maxHeight: 240, objectFit: 'contain', background: '#1A1814' }} />
                    </a>
                  ) : (
                    <video
                      src={`${item.url}#t=0.1`}
                      controls
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', maxHeight: 240, display: 'block', background: '#1A1814' }}
                    />
                  )}
                  {item.caption && (
                    <div className="px-2 py-1.5 text-[11px]" style={{ color: '#C4B89A' }}>{item.caption}</div>
                  )}
                </div>
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
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: i < payments.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                <div>
                  <div className="text-[12.5px] font-medium">${(p.amount_cents / 100).toFixed(2)}</div>
                  <div className="text-[11px]" style={{ color: '#8A8580' }}>Due {formatDate(p.due_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={p.status === 'paid' ? 'green' : p.status === 'overdue' ? 'red' : 'amber'}>
                    {p.status}
                  </Badge>
                  {p.status !== 'paid' && STRIPE_LINKS[student.enrollment_type] && (
                    <a
                      href={`${STRIPE_LINKS[student.enrollment_type]}?prefilled_email=${encodeURIComponent(user.email ?? '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-gold text-[11px] py-1 px-3"
                      style={{ textDecoration: 'none' }}>
                      Pay now →
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Material fee row — shown if enrolled on Tuesdays */}
            {(student.enrolled_days ?? []).includes(2) && (
              <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12.5px] font-medium">Tuesday Material Fee</div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>$100 · one-time supply kit fee</div>
                  </div>
                  <a
                    href={`${MATERIAL_FEE_LINK}?prefilled_email=${encodeURIComponent(user.email ?? '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-[11px] py-1 px-3"
                    style={{ textDecoration: 'none', background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
                    Pay fee →
                  </a>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
