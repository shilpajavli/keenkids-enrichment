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
import ParentNotesCard from '@/components/portal/ParentNotesCard'
import ConsentWall from '@/components/portal/ConsentWall'
import AutoRefresh from '@/components/ui/AutoRefresh'
import ParentSignOutButton from '@/components/portal/ParentSignOutButton'

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
  { month: 'September 2026', emoji: '🚗', theme: 'Motion & Transportation' },
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
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' })
}

export default async function ParentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; child?: string }>
}) {
  const { tab = 'today', child: childParam } = await searchParams

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  // Fetch students where user is primary OR secondary parent
  const [{ data: primary }, { data: secondary }] = await Promise.all([
    admin.from('students')
      .select('*, school:schools(*), needs_escort, teacher_name, room_number, pickup_person, pickup_notes, parent_notes, material_fee_paid')
      .eq('parent_id', user.id).eq('status', 'active'),
    admin.from('students')
      .select('*, school:schools(*), needs_escort, teacher_name, room_number, pickup_person, pickup_notes, parent_notes, material_fee_paid')
      .eq('parent2_id', user.id).eq('status', 'active'),
  ])
  const seen = new Set<string>()
  const allStudents = [...(primary ?? []), ...(secondary ?? [])].filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id); return true
  })

  if (!allStudents || allStudents.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="font-serif text-2xl font-light text-ink mb-2">No student linked yet</h2>
        <p className="text-ink-tertiary text-sm">Please contact your program administrator to link your child's account.</p>
      </div>
    )
  }

  const student = (childParam ? allStudents.find((s: { id: string }) => s.id === childParam) : null) ?? allStudents[0]

  // Check if parent has signed consent forms
  const { data: consent } = await admin.from('consents').select('id').eq('student_id', student.id).maybeSingle()
  if (!consent) {
    return <ConsentWall studentId={student.id} studentName={student.full_name} />
  }

  const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const today = localNow.toLocaleDateString('en-CA') // YYYY-MM-DD
  const todayDayIndex = localNow.getDay()
  const currentWeek = getMonday()
  const todaySchedule = todayDayIndex >= 1 && todayDayIndex <= 5 ? DAILY_SCHEDULE[todayDayIndex - 1] : null
  const initials = student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const [todayAttendanceRes, attendanceRes, paymentsRes, announcementsRes, curriculumRes, mediaRes, notesRes] = await Promise.all([
    admin.from('attendance').select('*').eq('student_id', student.id).eq('date', today).maybeSingle(),
    admin.from('attendance').select('date, status, sign_in_time, sign_out_time').eq('student_id', student.id).order('date', { ascending: false }).limit(10),
    admin.from('payments').select('*').eq('student_id', student.id).order('due_date', { ascending: false }),
    student.school_id
      ? supabase.from('announcements').select('*').or(`school_id.eq.${student.school_id},school_id.is.null`).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5)
      : supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
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
  const pendingPayments = payments.filter((p: any) => p.status !== 'paid')

  // Monthly payment schedule Sep 2026 – May 2027
  const PROGRAM_MONTHS = [
    { label: 'September 2026', year: 2026, month: 8  },
    { label: 'October 2026',   year: 2026, month: 9  },
    { label: 'November 2026',  year: 2026, month: 10 },
    { label: 'December 2026',  year: 2026, month: 11 },
    { label: 'January 2027',   year: 2027, month: 0  },
    { label: 'February 2027',  year: 2027, month: 1  },
    { label: 'March 2027',     year: 2027, month: 2  },
    { label: 'April 2027',     year: 2027, month: 3  },
    { label: 'May 2027',       year: 2027, month: 4  },
  ]
  const paidPeriods = new Set(
    payments
      .filter((p: any) => p.status === 'paid' && p.period)
      .map((p: any) => p.period as string)
  )
  const paidMonths = new Set(
    payments
      .filter((p: any) => p.status === 'paid' && p.paid_at && !p.period)
      .map((p: any) => { const d = new Date(p.paid_at); return `${d.getFullYear()}-${d.getMonth()}` })
  )
  const monthRows = PROGRAM_MONTHS.map(m => {
    const isPast = m.year < localNow.getFullYear() || (m.year === localNow.getFullYear() && m.month < localNow.getMonth())
    const isCurrent = m.year === localNow.getFullYear() && m.month === localNow.getMonth()
    const paid = paidPeriods.has(m.label) || paidMonths.has(`${m.year}-${m.month}`)
    return { ...m, isPast, isCurrent, paid }
  })
  // Show past + current; show next upcoming month only after the 20th (so parents can pay ahead)
  const showNextMonth = localNow.getDate() >= 20
  let nextShown = false
  const visibleMonthRows = monthRows.filter(m => {
    if (m.isPast || m.isCurrent || m.paid) return true
    if (showNextMonth && !nextShown) { nextShown = true; return true }
    return false
  })
  const unpaidDueCount = visibleMonthRows.filter(m => !m.paid).length
  const stripeLink = STRIPE_LINKS[student.enrollment_type]
  const stripeLinkWithEmail = stripeLink ? `${stripeLink}?prefilled_email=${encodeURIComponent(user.email ?? '')}` : null

  // Material fee: reconcile from admin-set flag on student record
  const materialFeePaid = (student as any).material_fee_paid ?? false

  // Upcoming monthly themes (current + next 2)
  const currentThemeIdx = MONTHLY_THEMES.findIndex(m => {
    const [monthName, year] = m.month.split(' ')
    const d = new Date(`${monthName} 1, ${year}`)
    return d.getFullYear() === localNow.getFullYear() && d.getMonth() === localNow.getMonth()
  })
  const upcomingThemes = MONTHLY_THEMES.slice(currentThemeIdx >= 0 ? currentThemeIdx : 0, (currentThemeIdx >= 0 ? currentThemeIdx : 0) + 3)

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'payments', label: 'Payments', badge: pendingPayments.length > 0 ? pendingPayments.length : null },
    { key: 'schedule', label: 'Schedule' },
  ]

  return (
    <div className="space-y-5">
      <AutoRefresh intervalMs={30_000} />

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

      {/* Child switcher — only shown when parent has multiple children */}
      {allStudents.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {allStudents.map((s: { id: string; full_name: string }) => (
            <Link key={s.id} href={`/portal?tab=${tab}&child=${s.id}`}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={{
                background: s.id === student.id ? '#1A1814' : '#EEEBE3',
                color: s.id === student.id ? '#B8973A' : '#8A8580',
              }}>
              {s.full_name.split(' ')[0]}
            </Link>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#EEEBE3' }}>
        {tabs.map(t => (
          <Link key={t.key} href={`/portal?tab=${t.key}${childParam ? `&child=${childParam}` : ''}`}
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
            needsEscort={student.needs_escort ?? false}
            pickupPerson={student.pickup_person ?? null}
            pickupNotes={student.pickup_notes ?? null}
            grade={student.grade ?? 0}
          />
          <ParentNotesCard studentId={student.id} notes={student.parent_notes ?? null} />

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

              {/* Parent self sign-out — visible when checked in but not yet signed out */}
              {todayRec && todayRec.sign_in_time && !todayRec.sign_out_time && (
                <div className="flex justify-end mb-3">
                  <ParentSignOutButton studentId={student.id} />
                </div>
              )}

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
                {attendance.slice(0, 5).map((rec: any, i: number) => (
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
          <Card>
            <CardHeader
              title="Monthly Payments"
              action={
                <div className="flex items-center gap-2">
                  {unpaidDueCount > 0
                    ? <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>{unpaidDueCount} due</span>
                    : <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#F0FAF4', color: '#27500A' }}>All paid ✓</span>
                  }
                  <a href={`/receipt/${student.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: '#F5F0E8', color: '#4A4640', border: '1px solid rgba(184,151,58,0.3)', textDecoration: 'none' }}>
                    🖨 Receipt
                  </a>
                </div>
              }
            />
            <CardBody className="p-0">
              {visibleMonthRows.map((m, i) => {
                const isUpcoming = !m.isPast && !m.isCurrent
                return (
                  <div key={m.label}
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{
                      borderBottom: i < visibleMonthRows.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none',
                      background: m.isCurrent && !m.paid ? 'rgba(254,243,199,0.3)' : 'transparent',
                    }}>
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{m.label}</div>
                      {m.isCurrent && <div className="text-[10px] mt-0.5" style={{ color: '#B8973A' }}>Current month</div>}
                      {m.isPast && !m.paid && <div className="text-[10px] mt-0.5" style={{ color: '#791F1F' }}>Overdue</div>}
                      {isUpcoming && !m.paid && <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>Upcoming — pay early</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {m.paid ? (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: '#EAF3DE', color: '#27500A' }}>✓ Paid</span>
                      ) : stripeLinkWithEmail ? (
                        <a href={stripeLinkWithEmail} target="_blank" rel="noopener noreferrer"
                          className="btn btn-gold text-[11px] py-1 px-3" style={{ textDecoration: 'none' }}>
                          Pay →
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {(student.enrolled_days ?? []).includes(2) && (
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
                  <div>
                    <div className="text-[13px] font-medium">Tuesday Material Fee</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>$100 · one-time supply kit</div>
                  </div>
                  {materialFeePaid ? (
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: '#EAF3DE', color: '#27500A' }}>✓ Paid</span>
                  ) : (
                    <a href={`${MATERIAL_FEE_LINK}?prefilled_email=${encodeURIComponent(user.email ?? '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn text-[11px] py-1 px-3"
                      style={{ textDecoration: 'none', background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
                      Pay fee →
                    </a>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
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
                    <div key={day} className="flex gap-4 px-5 py-2.5" style={{ borderBottom: '1px solid rgba(184,151,58,0.12)' }}>
                      <div className="w-20 text-[11px] font-medium flex-shrink-0 mt-0.5" style={{ color: '#B8973A' }}>{day}</div>
                      <div className="flex-1 space-y-0.5">
                        {dayItems.map((item, j) => (
                          <div key={j} className="flex items-baseline gap-2">
                            <span className="text-[13px] font-medium">{item.subject}</span>
                            {item.activity && <span className="text-[13px]" style={{ color: '#8A8580' }}>· {item.activity}</span>}
                            {(item as any).grade && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EFE6CC', color: '#8A6E25' }}>{(item as any).grade}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}

          {/* Weekly + Daily side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly activities — compact emoji chips */}
            <Card>
              <CardHeader title="Weekly Activities" />
              <CardBody className="p-3">
                <div className="space-y-1.5">
                  {DAILY_SCHEDULE.map(d => (
                    <div key={d.day} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(184,151,58,0.05)' }}>
                      <span className="text-base w-6 text-center flex-shrink-0">{d.emoji}</span>
                      <span className="text-[11px] w-16 flex-shrink-0" style={{ color: '#B8973A' }}>{d.day.slice(0, 3)}</span>
                      <span className="text-[12px] font-medium leading-tight" style={{ color: '#1A1814' }}>{d.theme}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Daily time schedule — Sinnott only */}
            {student.school?.name?.toLowerCase().includes('sinnott') && <Card>
              <CardHeader title="Daily Timing" />
              <CardBody className="p-3">
                <div className="space-y-1.5">
                  {[
                    { time: '2:00–2:20',  label: 'Snack & Outdoor Play',   emoji: '🍎' },
                    { time: '2:20–2:50',  label: 'Homework',               emoji: '📚' },
                    { time: '2:50–3:10',  label: 'Break / Catch-up',       emoji: '⏸️' },
                    { time: '3:10–4:20',  label: 'Theory + Build + Test',  emoji: '🔧' },
                    { time: '4:20–4:30',  label: 'Scientist Log',          emoji: '📓' },
                    { time: '4:30–4:40',  label: 'Cleanup & Pack-up',      emoji: '🧹' },
                    { time: '4:40–5:00',  label: 'Outdoor Play & Pickup',  emoji: '🌳' },
                  ].map(row => (
                    <div key={row.time} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(184,151,58,0.05)' }}>
                      <span className="text-base w-6 text-center flex-shrink-0">{row.emoji}</span>
                      <span className="text-[11px] tabular-nums w-16 flex-shrink-0" style={{ color: '#B8973A' }}>{row.time}</span>
                      <span className="text-[12px] leading-tight" style={{ color: '#1A1814' }}>{row.label}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>}
          </div>

          {/* Upcoming themes — horizontal chips */}
          <Card>
            <CardHeader title="Upcoming Themes" />
            <CardBody className="px-4 py-3">
              <div className="flex gap-2 flex-wrap">
                {upcomingThemes.map((m, i) => (
                  <div key={m.month} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]"
                    style={{
                      background: i === 0 ? '#1A1814' : '#F5F0E8',
                      color: i === 0 ? '#B8973A' : '#4A4640',
                    }}>
                    <span>{m.emoji}</span>
                    <span className="font-medium">{m.theme}</span>
                    <span className="text-[10px] opacity-60">{m.month.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  )
}
