import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
  id?: string
}

export function Card({ children, className, padding = false, id }: CardProps) {
  return (
    <div id={id} className={cn('bg-white rounded-xl overflow-hidden', className)}
      style={{ border: '1px solid rgba(184,151,58,0.32)' }}>
      {padding ? <div className="p-5">{children}</div> : children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  action?: React.ReactNode
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: '1px solid rgba(184,151,58,0.18)' }}>
      <h3 className="font-serif text-[17px] font-light tracking-wide">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>
}
