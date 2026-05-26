import { cn } from '@/lib/utils'

type Variant = 'green' | 'amber' | 'red' | 'blue' | 'gold' | 'gray'

const VARIANTS: Record<Variant, string> = {
  green: 'bg-[#EAF3DE] text-[#27500A]',
  amber: 'bg-[#FAEEDA] text-[#633806]',
  red:   'bg-[#FCEBEB] text-[#791F1F]',
  blue:  'bg-[#E6F1FB] text-[#0C447C]',
  gold:  'bg-[#EFE6CC] text-[#8A6E25]',
  gray:  'bg-[#F1EFE8] text-[#444441]',
}

interface Props {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'gray', children, className }: Props) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium tracking-wide', VARIANTS[variant], className)}>
      {children}
    </span>
  )
}
