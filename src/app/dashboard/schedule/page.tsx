import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'

export const metadata = { title: 'Schedule — KeenKids Enrichment' }

const ACTIVITIES = {
  coding: {
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', emoji: '💻',
    title: 'Coding & Technology',
    subtitle: 'Scratch (G2–6) · ScratchJr (G1–2)',
    description: 'Learn coding through fun animation, games and interactive projects!',
    bullets: ['Build stories & games', 'Animate characters', 'Solve problems', 'Think creatively'],
    tagline: 'CODE TODAY. CREATE TOMORROW.',
  },
  build: {
    color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', emoji: '🔧',
    title: 'STEAM Build Day',
    subtitle: 'Engineering & Design',
    description: 'Hands-on engineering and creative builds that inspire young innovators!',
    bullets: ['Design', 'Build', 'Test', 'Improve'],
    tagline: 'BUILD IDEAS. BUILD CONFIDENCE.',
  },
  science: {
    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', emoji: '🧪',
    title: 'Science Lab & Experiments',
    subtitle: 'Hands-on Discovery',
    description: 'Explore the world of science through exciting experiments and real discoveries!',
    bullets: ['Fun experiments', 'Ask questions', 'Make observations', 'Discover science'],
    tagline: 'EXPLORE SCIENCE. DISCOVER POSSIBILITIES.',
  },
  speaking: {
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', emoji: '🎤',
    title: 'Public Speaking & Communication',
    subtitle: 'Confidence Building',
    description: 'Build confidence, express ideas and become strong communicators!',
    bullets: ['Speak with confidence', 'Share ideas', 'Listen & connect', 'Lead with impact'],
    tagline: 'SPEAK UP. STAND OUT.',
  },
  exploration: {
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', emoji: '🎨',
    title: 'Free Exploration Station',
    subtitle: 'Open Creative Time',
    description: 'A creative open station where kids can create, build and explore their own ideas!',
    bullets: ['Create freely', 'Build & design', 'Explore materials', 'Imagine & innovate'],
    tagline: 'EXPLORE FREELY. CREATE FEARLESSLY.',
  },
}

// Sinnott: Mon=Coding, Tue=Build, Wed=Science, Thu=Speaking, Fri=Exploration
const WEEKLY_SINNOTT = [
  { day: 'Monday',    ...ACTIVITIES.coding },
  { day: 'Tuesday',   ...ACTIVITIES.build },
  { day: 'Wednesday', ...ACTIVITIES.science },
  { day: 'Thursday',  ...ACTIVITIES.speaking },
  { day: 'Friday',    ...ACTIVITIES.exploration },
]

// Mattos: Mon=Build, Tue=Coding, Wed=Speaking, Thu=Science, Fri=Exploration
const WEEKLY_MATTOS = [
  { day: 'Monday',    ...ACTIVITIES.build },
  { day: 'Tuesday',   ...ACTIVITIES.coding },
  { day: 'Wednesday', ...ACTIVITIES.speaking },
  { day: 'Thursday',  ...ACTIVITIES.science },
  { day: 'Friday',    ...ACTIVITIES.exploration },
]

const MONTHLY_THEMES = [
  { month: 'August',    year: 2026, theme: 'Motion & Transportation',  emoji: '🚗', color: '#2563EB' },
  { month: 'September', year: 2026, theme: 'Air & Flight',             emoji: '✈️',  color: '#16A34A' },
  { month: 'October',   year: 2026, theme: 'Spooky Science',           emoji: '🧙',  color: '#7C3AED' },
  { month: 'November',  year: 2026, theme: 'Engineering Machines',     emoji: '⚙️',  color: '#EA580C' },
  { month: 'December',  year: 2026, theme: 'Winter Builders',          emoji: '🏔️',  color: '#0891B2' },
  { month: 'January',   year: 2027, theme: 'Space Explorers',          emoji: '🪐',  color: '#4F46E5' },
  { month: 'February',  year: 2027, theme: 'Electricity & Light',      emoji: '💡',  color: '#D97706' },
  { month: 'March',     year: 2027, theme: 'Nature Engineers',         emoji: '🌱',  color: '#16A34A' },
  { month: 'April',     year: 2027, theme: 'Robotics & Coding',        emoji: '🤖',  color: '#2563EB' },
  { month: 'May',       year: 2027, theme: 'Inventor Challenge Month', emoji: '🏆',  color: '#B8973A' },
]

const PILLARS = [
  { icon: '🧠', label: 'Build Skills',       desc: 'Critical thinking, problem solving & creativity' },
  { icon: '🎤', label: 'Speak Confidently',  desc: 'Public speaking, teamwork & self-expression' },
  { icon: '🔬', label: 'Explore & Discover', desc: 'Hands-on experiments that make learning exciting' },
  { icon: '💡', label: 'Innovate & Create',  desc: 'Design, build and bring ideas to life' },
]

export default async function SchedulePage() {
  const supabase = await createServerClient()
  const programId = await getCurrentProgramId()

  const { data: program } = programId
    ? await supabase.from('programs').select('name, school:schools(name)').eq('id', programId).single()
    : { data: null }

  const schoolName = (program?.school as any)?.name ?? program?.name ?? ''
  const isSinnott = schoolName.toLowerCase().includes('sinnott')
  const isMattos  = schoolName.toLowerCase().includes('mattos')
  const hasSchedule = isSinnott || isMattos

  const weekly = isSinnott ? WEEKLY_SINNOTT : WEEKLY_MATTOS

  const now = new Date()
  const currentMonth = now.toLocaleString('en-US', { month: 'long' })
  const currentYear  = now.getFullYear()
  const currentThemeIdx = MONTHLY_THEMES.findIndex(t => t.month === currentMonth && t.year === currentYear)
  const currentTheme = currentThemeIdx >= 0 ? MONTHLY_THEMES[currentThemeIdx] : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Schedule</h1>
        <p className="text-ink-tertiary text-sm mt-1">
          {schoolName ? `${schoolName} · ` : ''}STEAM Enrichment Program
        </p>
      </div>

      {!hasSchedule ? (
        <div className="py-20 text-center" style={{ color: '#8A8580' }}>
          <p className="text-[14px]">Schedule not set for this program yet.</p>
        </div>
      ) : (
        <>
          {/* Current month theme banner */}
          {currentTheme && (
            <div className="rounded-xl px-6 py-4 flex items-center gap-4"
              style={{ background: 'linear-gradient(135deg, #1A1814 0%, #2C2820 100%)', border: '2px solid #B8973A' }}>
              <span className="text-3xl">{currentTheme.emoji}</span>
              <div>
                <div className="text-[10px] tracking-[0.15em] uppercase mb-0.5" style={{ color: 'rgba(184,151,58,0.8)' }}>
                  This Month's Theme
                </div>
                <div className="font-serif text-xl font-light text-white">{currentTheme.theme}</div>
              </div>
              <div className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {currentMonth} {currentYear}
              </div>
            </div>
          )}

          {/* Tagline */}
          <div className="text-center py-2">
            <div className="text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: '#B8973A' }}>Weekly Schedule</div>
            <div className="flex items-center justify-center gap-3 flex-wrap text-[12px] font-medium">
              {['BUILD', 'CODE', 'SPEAK', 'EXPLORE', 'CREATE'].map((w, i) => (
                <span key={w} style={{ color: ['#EA580C','#2563EB','#7C3AED','#16A34A','#DC2626'][i] }}>{w}</span>
              ))}
            </div>
          </div>

          {/* Weekly grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {weekly.map(day => (
              <div key={day.day} className="rounded-xl overflow-hidden flex flex-col"
                style={{ border: `2px solid ${day.border}`, background: day.bg }}>
                <div className="px-4 py-3 text-center" style={{ background: day.color }}>
                  <div className="text-[11px] font-bold tracking-[0.12em] text-white uppercase">{day.day}</div>
                </div>
                <div className="px-4 py-4 flex-1 flex flex-col gap-3">
                  <div className="text-3xl text-center">{day.emoji}</div>
                  <div className="text-center">
                    <div className="font-bold text-[13px] leading-tight" style={{ color: day.color }}>{day.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#8A8580' }}>{day.subtitle}</div>
                  </div>
                  <p className="text-[11.5px] text-center leading-relaxed" style={{ color: '#4A4640' }}>
                    {day.description}
                  </p>
                  <ul className="space-y-1">
                    {day.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-[11.5px]" style={{ color: '#4A4640' }}>
                        <span style={{ color: day.color, flexShrink: 0 }}>●</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-3 py-2.5 text-center text-[9.5px] font-bold tracking-wide"
                  style={{ background: day.color, color: 'white' }}>
                  {day.tagline}
                </div>
              </div>
            ))}
          </div>

          {/* Program pillars */}
          <div>
            <div className="text-[11px] tracking-[0.15em] uppercase text-center mb-4" style={{ color: '#B8973A' }}>
              What Kids Build
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PILLARS.map(p => (
                <div key={p.label} className="card px-4 py-4 text-center">
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="text-[12px] font-semibold mb-1" style={{ color: '#1A1814' }}>{p.label}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: '#8A8580' }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly themes */}
          <div>
            <div className="text-[11px] tracking-[0.15em] uppercase text-center mb-4" style={{ color: '#B8973A' }}>
              Monthly Themes · Aug 2026 – May 2027
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {MONTHLY_THEMES.map((t, idx) => {
                const isNow  = idx === currentThemeIdx
                const isPast = currentThemeIdx >= 0 && idx < currentThemeIdx
                return (
                  <div key={`${t.month}-${t.year}`}
                    className="card px-4 py-4 text-center relative overflow-hidden"
                    style={{
                      border: isNow ? `2px solid ${t.color}` : undefined,
                      background: isNow ? '#FAF7F2' : 'white',
                      opacity: isPast ? 0.45 : 1,
                    }}>
                    {isNow && (
                      <div className="absolute top-0 right-0 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg"
                        style={{ background: t.color, color: 'white' }}>NOW</div>
                    )}
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#8A8580' }}>
                      {t.month} <span style={{ color: '#C4B89A' }}>{t.year}</span>
                    </div>
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <div className="text-[11.5px] font-semibold leading-tight" style={{ color: t.color }}>{t.theme}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="text-center py-4">
            <p className="text-[12px] font-medium tracking-wide" style={{ color: '#8A8580' }}>
              A perfect mix of Engineering, Technology, Science, Communication & Creativity
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#B8973A' }}>
              to build confident thinkers, problem solvers and future innovators
            </p>
          </div>
        </>
      )}
    </div>
  )
}
