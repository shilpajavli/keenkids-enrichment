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

  // Upsert to handle re-marking
  const { data, error } = await supabase
    .from('attendance')
    .upsert(body, { onConflict: 'student_id,class_id,date' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
