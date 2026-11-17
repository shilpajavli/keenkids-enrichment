import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const school_id = searchParams.get('school_id')
  const week_of = searchParams.get('week_of')

  if (!school_id || !week_of) return NextResponse.json({ error: 'school_id and week_of required' }, { status: 400 })

  const { data, error } = await supabase
    .from('weekly_updates')
    .select('id, message, author_name, updated_at')
    .eq('school_id', school_id)
    .eq('week_of', week_of)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { school_id, week_of, message } = await req.json()
  if (!school_id || !week_of || !message?.trim())
    return NextResponse.json({ error: 'school_id, week_of and message required' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('weekly_updates')
    .upsert({
      school_id,
      week_of,
      message: message.trim(),
      author_name: profile?.full_name ?? null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'school_id,week_of' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
