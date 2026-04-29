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

  // Normalize: treat empty string class_id as null
  const records = (Array.isArray(body) ? body : [body]).map((r: Record<string, unknown>) => ({
    ...r,
    class_id: r.class_id || null,
  }))

  // If no class_id, upsert on student_id+date only
  const hasClassId = records.every(r => r.class_id)
  const conflictKey = hasClassId ? 'student_id,class_id,date' : 'student_id,date'

  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: conflictKey })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
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
