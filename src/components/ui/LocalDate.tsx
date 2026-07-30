'use client'

export default function LocalDate() {
  return (
    <span>
      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
    </span>
  )
}
