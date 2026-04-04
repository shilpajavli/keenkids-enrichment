import { formatTimeRange } from '@/lib/utils'
import type { Class } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_MAP = [1, 2, 3, 4, 5] // Mon=1 … Fri=5

const COLOR_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  purple: { bg: '#EEEDFE', border: '#7F77DD', text: '#3C3489' },
  teal:   { bg: '#E1F5EE', border: '#1D9E75', text: '#085041' },
  coral:  { bg: '#FAECE7', border: '#D85A30', text: '#712B13' },
  blue:   { bg: '#E6F1FB', border: '#378ADD', text: '#0C447C' },
}

export default function WeeklySchedule({ classes }: { classes: Class[] }) {
  return (
    <div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
        {DAYS.map((day, i) => {
          const dayClasses = classes.filter(c => c.day_of_week === DAY_MAP[i])
          return (
            <div key={day}>
              <div className="text-[10px] tracking-[0.12em] uppercase mb-2 font-medium" style={{ color: '#8A8580' }}>
                {day}
              </div>
              <div className="space-y-2">
                {dayClasses.length === 0 && (
                  <div className="h-16 rounded-lg border border-dashed flex items-center justify-center text-xs"
                    style={{ borderColor: 'rgba(184,151,58,0.2)', color: '#8A8580' }}>
                    No class
                  </div>
                )}
                {dayClasses.map((cls) => {
                  const c = COLOR_STYLES[cls.color] ?? COLOR_STYLES.purple
                  return (
                    <div key={cls.id} className="rounded-lg px-3 py-2.5"
                      style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                      <div className="text-[13px] font-medium" style={{ color: c.text }}>{cls.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#8A8580' }}>
                        {formatTimeRange(cls.start_time, cls.end_time)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
