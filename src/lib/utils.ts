import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

// ─── Classname helper ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date helpers ────────────────────────────────────────────────────────────

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatTime(time: string) {
  // "15:30" → "3:30 PM"
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

// ─── Currency helpers ────────────────────────────────────────────────────────

export function formatCurrency(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

// ─── String helpers ──────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

// ─── Progress helpers ────────────────────────────────────────────────────────

export function calcProgress(mastered: number, total: number) {
  if (total === 0) return 0
  return Math.round((mastered / total) * 100)
}

// ─── Color helpers (class → color name mapping) ──────────────────────────────

export const CLASS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  purple: { bg: 'bg-[#EEEDFE]', border: 'border-l-[#7F77DD]', text: 'text-[#3C3489]' },
  teal:   { bg: 'bg-[#E1F5EE]', border: 'border-l-[#1D9E75]', text: 'text-[#085041]' },
  coral:  { bg: 'bg-[#FAECE7]', border: 'border-l-[#D85A30]', text: 'text-[#712B13]' },
  blue:   { bg: 'bg-[#E6F1FB]', border: 'border-l-[#378ADD]', text: 'text-[#0C447C]' },
}

export const AVATAR_COLORS = [
  { bg: 'bg-gold-light', text: 'text-gold-dark' },
  { bg: 'bg-[#E1F5EE]',  text: 'text-[#085041]' },
  { bg: 'bg-[#FAECE7]',  text: 'text-[#712B13]' },
  { bg: 'bg-[#E6F1FB]',  text: 'text-[#0C447C]' },
  { bg: 'bg-[#F1EFE8]',  text: 'text-[#444441]' },
]

export function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}
