import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  width?: string
  render: (row: T) => React.ReactNode
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  emptyMessage?: string
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'No records found',
  className,
}: Props<T>) {
  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full border-collapse text-[12.5px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className="text-left py-2.5 px-3 text-[10px] tracking-[0.1em] uppercase font-medium"
                style={{
                  borderBottom: '1px solid rgba(184,151,58,0.32)',
                  color: '#8A8580',
                  width: col.width,
                }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-[13px]" style={{ color: '#8A8580' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr key={row[keyField] ?? i}
              className="transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = '#FDFAF5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {columns.map(col => (
                <td key={col.key} className="py-3 px-3"
                  style={{ borderBottom: '1px solid rgba(184,151,58,0.14)', color: '#4A4640' }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
