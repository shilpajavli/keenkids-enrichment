import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_HOURS = 3

// GET — list entries (teacher: own; admin: all, filterable by week/teacher)
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start')  // ISO date e.g. 2026-08-11
  const teacherId = searchParams.get('teacher_id')

  const admin = createAdminClient()
  let query = admin
    .from('time_entries')
    .select(`*, teacher:profiles!teacher_id(id, full_name, email), school:schools(id, name)`)
    .order('date', { ascending: false })

  if (profile?.role !== 'admin') {
    query = query.eq('teacher_id', user.id)
  } else if (teacherId) {
    query = query.eq('teacher_id', teacherId)
  }

  if (weekStart) {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    query = query.gte('date', weekStart).lte('date', end.toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST — clock in
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const today = new Date().toISOString().slice(0, 10)

  // Check for existing entry today
  const { data: existing } = await supabase
    .from('time_entries')
    .select('id, clock_out')
    .eq('teacher_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    if (!existing.clock_out) return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
    return NextResponse.json({ error: 'Already completed a shift today' }, { status: 400 })
  }

  // Get teacher's school via program assignment (or from body)
  const { data: rate } = await supabase
    .from('teacher_rates')
    .select('hourly_rate')
    .eq('teacher_id', user.id)
    .single()

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      teacher_id: user.id,
      school_id: body.school_id ?? null,
      date: today,
      clock_in: new Date().toISOString(),
      notes: body.notes ?? null,
      hourly_rate: rate?.hourly_rate ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH — clock out or approve/reject
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const body = await req.json()
  const { id, action, notes, status } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  // Clock out
  if (action === 'clock_out') {
    const { data: entry } = await supabase
      .from('time_entries')
      .select('clock_in, teacher_id')
      .eq('id', id)
      .single()

    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    if (entry.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const clockOut = new Date()
    const clockIn = new Date(entry.clock_in)
    let hours = (clockOut.getTime() - clockIn.getTime()) / 3600000
    hours = Math.min(hours, MAX_HOURS) // cap at 3 hours
    hours = Math.round(hours * 100) / 100

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        clock_out: clockOut.toISOString(),
        hours,
        notes: notes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Approve / reject (admin only)
  if (action === 'update_status') {
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await admin
      .from('time_entries')
      .update({
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
