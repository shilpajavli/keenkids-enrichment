import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ data: [] })

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    .eq('role', 'parent')
    .limit(6)

  return NextResponse.json({ data: data ?? [] })
}
