import { useState, useEffect, useCallback } from 'react'

// ─── Generic fetch hook ──────────────────────────────────────────────────────

export function useFetch<T>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data ?? json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { refetch() }, [refetch, ...deps])

  return { data, loading, error, refetch }
}

// ─── Students hook ───────────────────────────────────────────────────────────

export function useStudents(classId?: string) {
  const url = classId ? `/api/students?class_id=${classId}` : '/api/students'
  return useFetch<any[]>(url)
}

// ─── Attendance hook ─────────────────────────────────────────────────────────

export function useAttendance(params: { date?: string; student_id?: string; class_id?: string } = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
  ).toString()
  return useFetch<any[]>(`/api/attendance${query ? `?${query}` : ''}`)
}

// ─── Media hook ──────────────────────────────────────────────────────────────

export function useMedia(params: { student_id?: string; type?: string } = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
  ).toString()
  return useFetch<any[]>(`/api/media${query ? `?${query}` : ''}`)
}

// ─── Announcements hook ──────────────────────────────────────────────────────

export function useAnnouncements() {
  return useFetch<any[]>('/api/announcements')
}

// ─── Payments hook ───────────────────────────────────────────────────────────

export function usePayments(status?: string) {
  const url = status ? `/api/payments?status=${status}` : '/api/payments'
  return useFetch<any[]>(url)
}

// ─── Debounce hook ───────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Local storage hook ──────────────────────────────────────────────────────

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch { return initialValue }
  })

  const set = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  return [value, set] as const
}
