import { cn } from '@/lib/utils'

interface Props {
  value: number        // 0–100
  color?: string       // CSS color, defaults to gold
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ value, color = '#B8973A', className, showLabel = false }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-[11px]">
          <span style={{ color: '#8A8580' }}>Progress</span>
          <span className="font-medium" style={{ color: '#4A4640' }}>{pct}%</span>
        </div>
      )}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#EDE8DE' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
