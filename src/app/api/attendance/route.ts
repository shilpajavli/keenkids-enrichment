import { createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const studentId = searchParams.get('student_id')

  let query = supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false })

  if (date) query = query.eq('date', date)
  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const items: Record<string, unknown>[] = Array.isArray(body) ? body : [body]

  const results = []
  for (const item of items) {
    const studentId = item.student_id as string
    const date = item.date as string

    // Check for existing record for this student on this date
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      // Update it
      const { data, error } = await supabase
        .from('attendance')
        .update({ status: item.status, sign_in_time: item.sign_in_time ?? null, sign_out_time: item.sign_out_time ?? null })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      results.push(data)
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('attendance')
        .insert({ student_id: studentId, date, status: item.status, sign_in_time: item.sign_in_time ?? null })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      results.push(data)
    }
  }

  return NextResponse.json({ data: results })
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('attendance')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
