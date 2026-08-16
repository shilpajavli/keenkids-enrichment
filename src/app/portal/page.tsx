export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { CurriculumItem } from '@/types'
import Link from 'next/link'
import LocalDate from '@/components/ui/LocalDate'
import StudentInfoCard from '@/components/portal/StudentInfoCard'

const STRIPE_LINKS: Record<string, string> = {
  '5_day': 'https://buy.stripe.com/fZu3co3pf6zT1MHg1me3e02',
  '3_day': 'https://buy.stripe.com/14A28k1h7aQ9dvp6qMe3e04',
  '1_day': 'https://buy.stripe.com/3cIcMYbVLf6p8b57uQe3e03',
}
const MATERIAL_FEE_LINK = 'https://buy.stripe.com/bJeeV6aRHgatbnhaH2e3e00'

const DAILY_SCHEDULE = [
  { day: 'Monday',    emoji: '🔧', theme: 'STEAM Build Day',               sub: 'Engineering & Design',              bullets: ['Design', 'Build', 'Test', 'Improve'],                                           tagline: 'BUILD IDEAS. BUILD CONFIDENCE.' },
  { day: 'Tuesday',   emoji: '💻', theme: 'Coding & Technology',           sub: 'Scratch (G2–6) · ScratchJr (G1–2)', bullets: ['Build stories & games', 'Animate characters', 'Solve problems', 'Think creatively'], tagline: 'CODE TODAY. CREATE TOMORROW.' },
  { day: 'Wednesday', emoji: '🎤', theme: 'Public Speaking',               sub: 'Confidence Building',               bullets: ['Speak with confidence', 'Share ideas', 'Listen & connect', 'Lead with impact'],  tagline: 'SPEAK UP. STAND OUT.' },
  { day: 'Thursday',  emoji: '🧪', theme: 'Science Lab & Experiments',     sub: 'Hands-on Discovery',                bullets: ['Fun experiments', 'Ask questions', 'Make observations', 'Discover science'],     tagline: 'EXPLORE SCIENCE. DISCOVER POSSIBILITIES.' },
  { day: 'Friday',    emoji: '🎨', theme: 'Free Exploration Station',      sub: 'Open Creative Time',                bullets: ['Create freely', 'Build & design', 'Explore materials', 'Imagine & innovate'],    tagline: 'EXPLORE FREELY. CREATE FEARLESSLY.' },
]

const MONTHLY_THEMES = [
  { month: 'August 2026',    emoji: '🚗', theme: 'Motion & Transportation' },
  { month: 'September 2026', emoji: '✈️', theme: 'Air & Flight' },
  { month: 'October 2026',   emoji: '🧙', theme: 'Spooky Science' },
  { month: 'November 2026',  emoji: '⚙️', theme: 'Engineering Machines' },
  { month: 'December 2026',  emoji: '🏔️', theme: 'Winter Builders' },
  { month: 'January 2027',   emoji: '🪐', theme: 'Space Explorers' },
  { month: 'February 2027',  emoji: '💡', theme: 'Electricity & Light' },
  { month: 'March 2027',     emoji: '🌱', theme: 'Nature Engineers' },
  { month: 'April 2027',     emoji: '🤖', theme: 'Robotics & Coding' },
  { month: 'May 2027',       emoji: '🏆', theme: 'Inventor Challenge Month' },
]

function getMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function formatTime(ts: string | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default async function ParentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'today' } = await searchParams

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

  const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const today = localNow.toLocaleDateString('en-CA') // YYYY-MM-DD
  const todayDayIndex = localNow.getDay()
  const currentWeek = getMonday()
  const todaySchedule = todayDayIndex >= 1 && todayDayIndex <= 5 ? DAILY_SCHEDULE[todayDayIndex - 1] : null
  const initials = student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const admin = createAdminClient()

  const [todayAttendanceRes, attendanceRes, paymentsRes, announcementsRes, curriculumRes, mediaRes, notesRes] = await Promise.all([
    supabase.from('attendance').select('*').eq('student_id', student.id).eq('date', today).maybeSingle(),
    supabase.from('attendance').select('date, status, sign_in_time, sign_out_time').eq('student_id', student.id).order('date', { ascending: false }).limit(10),
    supabase.from('payments').select('*').eq('student_id', student.id).order('due_date', { ascending: false }),
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    student.school_id
      ? supabase.from('curriculum').select('*').eq('school_id', student.school_id).eq('week_of', currentWeek).single()
      : Promise.resolve({ data: null }),
    supabase.from('media').select('*').or(`student_id.eq.${student.id},student_id.is.null`).order('created_at', { ascending: false }).limit(8),
    admin.from('teacher_notes').select('content, created_at').eq('student_id', student.id).order('created_at', { ascending: false }).limit(5),
  ])

  const todayRec = todayAttendanceRes.data
  const attendance = attendanceRes.data ?? []
  const payments = paymentsRes.data ?? []
  const announcements = announcementsRes.data ?? []
  const curriculum = curriculumRes.data
  const media = mediaRes.data ?? []
  const notes = notesRes.data ?? []
  const pendingPayments = payments.filter(p => p.status !== 'paid')

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'payments', label: 'Payments', badge: pendingPayments.length > 0 ? pendingPayments.length : null },
    { key: 'schedule', label: 'Schedule' },
  ]

  return (
    <div className="space-y-5">

      {/* Student header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium text-white flex-shrink-0"
          style={{ background: '#8A6E25' }}>
          {initials}
        </div>
        <div>
          <h1 className="font-serif text-xl font-light" style={{ color: '#1A1814' }}>{student.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="blue">{student.grade === 0 ? 'Kindergarten' : `Grade ${student.grade}`}</Badge>
            {student.school && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#E8E4F8', color: '#5B4B8A' }}>
                {student.school.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#EEEBE3' }}>
        {tabs.map(t => (
          <Link key={t.key} href={`/portal?tab=${t.key}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? '#1A1814' : '#8A8580',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
            {t.badge && (
              <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
                style={{ background: '#B8973A' }}>{t.badge}</span>
            )}
          </Link>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        <div className="space-y-4">
          {/* School info */}
          <StudentInfoCard
            studentId={student.id}
            teacherName={student.teacher_name ?? null}
            roomNumber={student.room_number ?? null}
          />

          {/* Today's status */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] font-medium mb-0.5" style={{ color: '#8A8580' }}>
                    <LocalDate />
                  </div>
                  <div className="font-serif text-[17px] font-light" style={{ color: '#1A1814' }}>Today's Status</div>
                </div>
                {todayRec ? (
                  <Badge variant={todayRec.status === 'present' ? 'green' : todayRec.status === 'late' ? 'amber' : 'red'}>
                    {todayRec.status}
                  </Badge>
                ) : (
                  <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: '#F1EFE8', color: '#8A8580' }}>
                    Not checked in
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3.5" style={{ background: todayRec?.sign_in_time ? '#F0FAF4' : '#F5F0E8', border: `1px solid ${todayRec?.sign_in_time ? 'rgba(39,80,10,0.18)' : 'rgba(184,151,58,0.2)'}` }}>
                  <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Checked In</div>
                  <div className="text-[18px] font-medium" style={{ color: todayRec?.sign_in_time ? '#27500A' : '#C4B89A' }}>
                    {formatTime(todayRec?.sign_in_time ?? null)}
                  </div>
                </div>
                <div className="rounded-xl p-3.5" style={{ background: todayRec?.sign_out_time ? '#F0FAF4' : '#F5F0E8', border: `1px solid ${todayRec?.sign_out_time ? 'rgba(39,80,10,0.18)' : 'rgba(184,151,58,0.2)'}` }}>
                  <div className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#8A8580' }}>Signed Out</div>
                  <div className="text-[18px] font-medium" style={{ color: todayRec?.sign_out_time ? '#27500A' : '#C4B89A' }}>
                    {formatTime(todayRec?.sign_out_time ?? null)}
                  </div>
                </div>
              </div>

              {todaySchedule && (
                <div className="rounded-xl p-3.5" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.25)' }}>
                  <div className="text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: '#8A8580' }}>Today's Activity</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{todaySchedule.emoji}</span>
                    <span className="text-[14px] font-semibold" style={{ color: '#1A1814' }}>{todaySchedule.theme}</span>
                  </div>
                  <div className="text-[11.5px] mb-1.5" style={{ color: '#8A8580' }}>{todaySchedule.sub}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {todaySchedule.bullets.map(b => (
                      <span key={b} className="text-[11.5px]" style={{ color: '#5B4B8A' }}>● {b}</span>
                    ))}
                  </div>
                </div>
              )}
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
                    <div className="flex items-start gap-2 mb-1">
                      {ann.pinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
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

          {/* Teacher notes */}
          {notes.length > 0 && (
            <Card>
              <CardHeader title="Notes from your teacher" />
              <CardBody className="p-0">
                {notes.map((note: { content: string; created_at: string }, i: number) => (
                  <div key={i} className="px-5 py-4"
                    style={{ borderBottom: i < notes.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                    <div className="text-[13px] leading-relaxed" style={{ color: '#1A1814' }}>{note.content}</div>
                    <div className="text-[11px] mt-1.5" style={{ color: '#8A8580' }}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Recent attendance */}
          {attendance.length > 0 && (
            <Card>
              <CardHeader title="Recent Attendance" />
              <CardBody className="p-0">
                {attendance.slice(0, 5).map((rec, i) => (
                  <div key={`${rec.date}-${i}`} className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: i < Math.min(attendance.length, 5) - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none' }}>
                    <div>
                      <div className="text-[12.5px] font-medium">{formatDate(rec.date)}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                        {rec.sign_in_time ? `In ${formatTime(rec.sign_in_time)}` : ''}
                        {rec.sign_in_time && rec.sign_out_time ? ' · ' : ''}
                        {rec.sign_out_time ? `Out ${formatTime(rec.sign_out_time)}` : ''}
                        {!rec.sign_in_time && !rec.sign_out_time ? 'No time recorded' : ''}
                      </div>
                    </div>
                    <Badge variant={rec.status === 'present' ? 'green' : rec.status === 'late' ? 'amber' : 'red'}>
                      {rec.status}
                    </Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Photos */}
          {media.length > 0 && (
            <Card>
              <CardHeader title="Photos & Videos" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  {media.slice(0, 4).map(item => (
                    <div key={item.id} className="rounded-lg overflow-hidden aspect-square"
                      style={{ background: '#1A1814', border: '1px solid rgba(184,151,58,0.2)' }}>
                      {item.type === 'photo' ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                          <img src={item.url} alt={item.caption ?? ''} className="w-full h-full" style={{ objectFit: 'cover' }} />
                        </a>
                      ) : (
                        <video src={`${item.url}#t=0.1`} controls playsInline preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          {payments.length === 0 ? (
            <Card><CardBody>
              <p className="text-center py-6 text-[13px]" style={{ color: '#8A8580' }}>No payment records yet.</p>
            </CardBody></Card>
          ) : (
            <Card>
              <CardHeader
                title="Payments"
                action={
                  <div className="flex items-center gap-2">
                    {pendingPayments.length > 0
                      ? <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>{pendingPayments.length} pending</span>
                      : <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#F0FAF4', color: '#27500A' }}>All paid ✓</span>
                    }
                    <a href={`/portal/receipt/${student.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] px-2.5 py-1 rounded-lg"
                      style={{ background: '#F5F0E8', color: '#4A4640', border: '1px solid rgba(184,151,58,0.3)', textDecoration: 'none' }}>
                      🖨 Receipt
                    </a>
                  </div>
                }
              />
              <CardBody className="p-0">
                {payments.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: i < payments.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none', background: p.status !== 'paid' ? 'rgba(254,243,199,0.3)' : 'transparent' }}>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: '#1A1814' }}>${(p.amount_cents / 100).toFixed(2)}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>Due {formatDate(p.due_date)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === 'paid' ? 'green' : p.status === 'overdue' ? 'red' : 'amber'}>
                        {p.status}
                      </Badge>
                      {p.status !== 'paid' && STRIPE_LINKS[student.enrollment_type] && (
                        <a href={`${STRIPE_LINKS[student.enrollment_type]}?prefilled_email=${encodeURIComponent(user.email ?? '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn btn-gold text-[11px] py-1 px-3" style={{ textDecoration: 'none' }}>
                          Pay →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {(student.enrolled_days ?? []).includes(2) && (
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ borderTop: '1px solid rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
                    <div>
                      <div className="text-[13px] font-medium">Tuesday Material Fee</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>$100 · one-time supply kit</div>
                    </div>
                    <a href={`${MATERIAL_FEE_LINK}?prefilled_email=${encodeURIComponent(user.email ?? '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn text-[11px] py-1 px-3"
                      style={{ textDecoration: 'none', background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
                      Pay fee →
                    </a>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* This week's curriculum if posted */}
          {curriculum && (
            <Card>
              <CardHeader title={curriculum.title} action={<span className="text-[11px]" style={{ color: '#8A8580' }}>This week</span>} />
              <CardBody className="p-0">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                  const dayItems = ((curriculum.content ?? []) as CurriculumItem[]).filter(item => item.day === day)
                  if (dayItems.length === 0) return null
                  return (
                    <div key={day} className="flex gap-4 px-5 py-3" style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                      <div className="w-24 text-[12px] font-medium flex-shrink-0 mt-0.5" style={{ color: '#B8973A' }}>{day}</div>
                      <div className="flex-1 space-y-1">
                        {dayItems.map((item, j) => (
                          <div key={j}>
                            <span className="text-[13px] font-medium">{item.subject}</span>
                            {item.activity && <span className="text-[13px]" style={{ color: '#4A4640' }}> — {item.activity}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}

          {/* Weekly schedule — compact */}
          <Card>
            <CardHeader title="Weekly Schedule" />
            <CardBody className="p-0">
              {DAILY_SCHEDULE.map((d, i) => (
                <div key={d.day} className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: i < DAILY_SCHEDULE.length - 1 ? '1px solid rgba(184,151,58,0.12)' : 'none' }}>
                  <span className="text-xl w-7 flex-shrink-0">{d.emoji}</span>
                  <div>
                    <div className="text-[11px]" style={{ color: '#8A8580' }}>{d.day}</div>
                    <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{d.theme}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Monthly themes — current + next 2 */}
          {(() => {
            const now = localNow
            const currentIdx = MONTHLY_THEMES.findIndex(m => {
              const [monthName, year] = m.month.split(' ')
              const d = new Date(`${monthName} 1, ${year}`)
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
            })
            const startIdx = currentIdx >= 0 ? currentIdx : 0
            const upcoming = MONTHLY_THEMES.slice(startIdx, startIdx + 3)
            return (
              <Card>
                <CardHeader title="Upcoming Themes" />
                <CardBody className="p-0">
                  {upcoming.map((m, i) => (
                    <div key={m.month} className="flex items-center gap-3 px-5 py-3"
                      style={{ borderBottom: i < upcoming.length - 1 ? '1px solid rgba(184,151,58,0.12)' : 'none',
                               background: i === 0 ? 'rgba(184,151,58,0.06)' : 'transparent' }}>
                      <span className="text-xl w-7 flex-shrink-0">{m.emoji}</span>
                      <div className="flex-1">
                        <div className="text-[11px]" style={{ color: '#8A8580' }}>{m.month}</div>
                        <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{m.theme}</div>
                      </div>
                      {i === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#EFE6CC', color: '#8A6E25' }}>This month</span>}
                    </div>
                  ))}
                </CardBody>
              </Card>
            )
          })()}
        </div>
      )}

    </div>
  )
}
