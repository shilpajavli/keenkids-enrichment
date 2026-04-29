'use client'

import { useEffect } from 'react'

export default function TrackPresence() {
  useEffect(() => {
    fetch('/api/presence', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
