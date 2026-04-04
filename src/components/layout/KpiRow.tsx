interface Kpi {
  label: string
  value: number | string
  accent?: 'gold' | 'green' | 'red' | 'blue'
}

const ACCENT_COLORS: Record<string, string> = {
  gold:  '#B8973A',
  green: '#1D9E75',
  red:   '#E24B4A',
  blue:  '#378ADD',
}

const VALUE_COLORS: Record<string, string> = {
  gold:  '#1A1814',
  green: '#27500A',
  red:   '#791F1F',
  blue:  '#0C447C',
}

export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0,1fr))` }}>
      {kpis.map((kpi) => (
        <div key={kpi.label} className="kpi-card">
          <div className="w-7 h-0.5 mb-3 rounded-full"
            style={{ background: ACCENT_COLORS[kpi.accent ?? 'gold'] }} />
          <div className="font-serif text-4xl font-light leading-none"
            style={{ color: VALUE_COLORS[kpi.accent ?? 'gold'] }}>
            {kpi.value}
          </div>
          <div className="text-[11px] mt-1.5 tracking-wide" style={{ color: '#8A8580' }}>
            {kpi.label}
          </div>
        </div>
      ))}
    </div>
  )
}
