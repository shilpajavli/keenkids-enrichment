import { Card, CardBody } from '@/components/ui/Card'

export const metadata = { title: 'Schedule — KeenKids Enrichment' }

const SCHEDULE = [
  {
    day: 'Monday',
    theme: 'Bio-Engineering',
    color: '#27500A',
    bg: '#EAF3DE',
    grades: [
      { grade: 'TK/K', activity: 'Window Baggie Garden', description: 'Grow lima beans in a simple Ziploc setup and observe how plants sprout and grow.' },
      { grade: 'Grades 1–3', activity: 'Mini-Earth Terrarium', description: 'Build a self-sustaining ecosystem using pebbles, soil, and moss in a sealed container.' },
    ],
    goals: ['Water cycle', 'Plant growth', 'How ecosystems sustain themselves'],
  },
  {
    day: 'Tuesday',
    theme: 'Cargo & Balance',
    color: '#7C4A00',
    bg: '#FEF0DC',
    grades: [
      { grade: 'TK/K', activity: 'Foil Freighter', description: 'Build a boat using foil and test how many pennies it can carry without sinking.' },
      { grade: 'Grades 1–3', activity: 'Bottle Boat Crane', description: 'Design a floating structure with a crane to lift and balance cargo.' },
    ],
    goals: ['Balance', 'Weight distribution', 'Floating & sinking'],
  },
  {
    day: 'Wednesday',
    theme: 'Solar Optics',
    color: '#7A4F00',
    bg: '#FEF9DC',
    grades: [
      { grade: 'TK/K', activity: 'Rainbow Catcher Wand', description: 'Use reflective materials to bounce light and create fun visual effects.' },
      { grade: 'Grades 1–3', activity: 'Signal Array', description: 'Create adjustable mirrors to redirect and control light.' },
    ],
    goals: ['Light reflection', 'Angles', 'How light travels'],
  },
  {
    day: 'Thursday',
    theme: 'Aerodynamics & Wind Power',
    color: '#1A3A6E',
    bg: '#DCE8FE',
    grades: [
      { grade: 'TK/K', activity: 'Puff-Mobile', description: 'Create a wind-powered car and race it using air power!' },
      { grade: 'Grades 1–3', activity: 'Hoop Glider', description: 'Build and test a unique glider to explore flight and air movement.' },
    ],
    goals: ['Air movement', 'Flight basics', 'Speed & motion'],
  },
  {
    day: 'Friday',
    theme: 'Global Engineering Summit & Showcase',
    color: '#6B1F7C',
    bg: '#F5DCFE',
    grades: [
      {
        grade: 'TK/K & Grades 1–3',
        activity: 'Saving the Earth Through Engineering',
        description: "Students bring together everything they've learned in a fun Global Engineering Summit. Children step into the role of real-world engineers, presenting their solutions to major environmental challenges through a guided, age-appropriate dramatic showcase.",
      },
    ],
    goals: ['Dramatics', 'Creativity', 'Public Speaking'],
  },
]

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Spring Break Schedule</h1>
        <p className="text-ink-tertiary text-sm mt-1">April 13–17, 2026 · Morning & Afternoon Batches</p>
      </div>

      <div className="space-y-4">
        {SCHEDULE.map(day => (
          <Card key={day.day}>
            <div className="px-5 py-4 flex flex-wrap items-center gap-4"
              style={{ borderBottom: '1px solid rgba(184,151,58,0.18)', background: day.bg }}>
              <div>
                <div className="text-[11px] font-medium tracking-widest uppercase mb-0.5" style={{ color: day.color, opacity: 0.6 }}>{day.day}</div>
                <div className="font-serif text-[20px] font-light" style={{ color: day.color }}>{day.theme}</div>
              </div>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {day.goals.map(g => (
                  <span key={g} className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(255,255,255,0.7)', color: day.color }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <CardBody className="p-0">
              {day.grades.map((g, i) => (
                <div key={g.grade} className="px-5 py-4 flex gap-4"
                  style={{ borderBottom: i < day.grades.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                  <div className="flex-shrink-0 w-32">
                    <span className="text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap"
                      style={{ background: day.bg, color: day.color }}>
                      {g.grade}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium mb-1" style={{ color: '#1A1814' }}>{g.activity}</div>
                    <div className="text-[12.5px] leading-relaxed" style={{ color: '#4A4640' }}>{g.description}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
