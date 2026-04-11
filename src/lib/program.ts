import { cookies } from 'next/headers'
import { createServerClient } from './supabase-server'

export async function getCurrentProgramId(): Promise<string | null> {
  const cookieStore = await cookies()
  const stored = cookieStore.get('kk_program')?.value
  if (stored) return stored

  // Fallback to most recent program
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('programs')
    .select('id')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  return data?.id ?? null
}
