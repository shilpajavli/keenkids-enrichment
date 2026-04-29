import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const studentId = searchParams.get('student_id')
  const classId = searchParams.get('class_id')

  let query = supabase
    .from('attendance')
    .select('*, student:students(full_name, avatar_url), class:classes(name)')
    .order('date', { ascending: false })

  if (date) query = query.eq('date', date)
  if (studentId) query = query.eq('student_id', studentId)
  if (classId) query = query.eq('class_id', classId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const body = await req.json()

  const records = (Array.isArray(body) ? body : [body]).map((r: Record<string, unknown>) => ({
    ...r,
    class_id: r.class_id || null,
  }))

  const results = []
  for (const record of records) {
    // Check if a record already exists for this student+date
    let query = supabase
      .from('attendance')
      .select('id')
      .eq('student_id', record.student_id as string)
      .eq('date', record.date as string)

    if (record.class_id) query = query.eq('class_id', record.class_id as string)
    else query = query.is('class_id', null)

    const { data: existing } = await query.maybeSingle()

    if (existing?.id) {
      // Update existing record
      const { data, error } = await supabase
        .from('attendance')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      results.push(data)
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('attendance')
        .insert(record)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      results.push(data)
    }
  }

  return NextResponse.json({ data: results })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
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
