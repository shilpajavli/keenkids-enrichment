import { cookies } from 'next/headers'
import { createServerClient } from './supabase-server'

export async function getCurrentProgramId(): Promise<string | null> {
  const cookieStore = await cookies()
  const stored = cookieStore.get('kk_program')?.value
  if (stored) return stored

  const supabase = await createServerClient()
  const today = new Date().toISOString().slice(0, 10)

  // 1. Currently active program (today is between start and end)
  const { data: active } = await supabase
    .from('programs')
    .select('id')
    .lte('start_date', today)
    .gte('end_date', today)
    .limit(1)
    .single()

  if (active) return active.id

  // 2. Next upcoming program (closest future start date)
  const { data: upcoming } = await supabase
    .from('programs')
    .select('id')
    .gt('start_date', today)
    .order('start_date', { ascending: true })
    .limit(1)
    .single()

  if (upcoming) return upcoming.id

  // 3. Most recent past program
  const { data: past } = await supabase
    .from('programs')
    .select('id')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  return past?.id ?? null
}
