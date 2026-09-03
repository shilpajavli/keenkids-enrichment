import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, teacher_name, room_number, needs_escort, pickup_person, pickup_notes, grade } = await req.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const admin = createAdminClient()
  // Verify this parent owns the student before updating
  const { data: student } = await admin.from('students').select('parent_id, parent2_id').eq('id', student_id).single()
  if (!student || (student.parent_id !== user.id && (student as any).parent2_id !== user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('students')
    .update({ teacher_name, room_number, needs_escort: needs_escort ?? false, pickup_person, pickup_notes, ...(grade !== undefined ? { grade } : {}) })
    .eq('id', student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
