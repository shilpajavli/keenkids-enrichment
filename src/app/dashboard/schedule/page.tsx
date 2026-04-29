export const metadata = { title: 'Schedule — KeenKids Enrichment' }

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Schedule</h1>
        <p className="text-ink-tertiary text-sm mt-1">Weekly program schedule</p>
      </div>

      <div className="py-20 text-center" style={{ color: '#8A8580' }}>
        <p className="text-[14px]">No schedule set for this program yet.</p>
        <p className="text-[12px] mt-1">Check back soon.</p>
      </div>
    </div>
  )
}
