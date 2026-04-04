import { getInitials, getAvatarColor } from '@/lib/utils'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface Props {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm:  { outer: 'w-8 h-8',   text: 'text-[11px]' },
  md:  { outer: 'w-10 h-10', text: 'text-[13px]' },
  lg:  { outer: 'w-12 h-12', text: 'text-[15px]' },
}

export default function StudentAvatar({ name, avatarUrl, size = 'md', className }: Props) {
  const { outer, text } = SIZES[size]
  const { bg, text: textColor } = getAvatarColor(name)

  if (avatarUrl) {
    return (
      <div className={cn('rounded-full overflow-hidden flex-shrink-0', outer, className)}>
        <Image src={avatarUrl} alt={name} width={48} height={48} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center flex-shrink-0 font-serif font-light', outer, bg, textColor, text, className)}>
      {getInitials(name)}
    </div>
  )
}
