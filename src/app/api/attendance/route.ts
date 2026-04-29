import { createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
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
  try {
    const supabase = createAdminClient()
    const body = await req.json()

    const raw: Record<string, unknown>[] = Array.isArray(body) ? body : [body]
    const records: Record<string, unknown>[] = raw.map(r => ({ ...r, class_id: (r.class_id as string) || null }))

    const results = []
    for (const record of records) {
      const studentId = record.student_id as string
      const date = record.date as string

      const { data: rows, error: selErr } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', date)

      if (selErr) return NextResponse.json({ error: 'select: ' + selErr.message }, { status: 400 })

      const existing = rows?.[0]

      if (existing?.id) {
        const { data, error } = await supabase
          .from('attendance')
          .update(record)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) return NextResponse.json({ error: 'update: ' + error.message }, { status: 400 })
        results.push(data)
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert(record)
          .select()
          .single()
        if (error) return NextResponse.json({ error: 'insert: ' + error.message }, { status: 400 })
        results.push(data)
      }
    }

    return NextResponse.json({ data: results })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
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
