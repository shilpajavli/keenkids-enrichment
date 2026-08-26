import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { period, amount_cents, due_date, program_id } = await req.json()
  if (!period || !amount_cents || !program_id) {
    return NextResponse.json({ error: 'period, amount_cents, and program_id are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get all active students in this program
  const { data: students, error: studentsErr } = await admin
    .from('students')
    .select('id')
    .eq('program_id', program_id)
    .eq('status', 'active')

  if (studentsErr) return NextResponse.json({ error: studentsErr.message }, { status: 500 })

  // Find students who already have a payment for this period
  const studentIds = (students ?? []).map((s: any) => s.id)
  const { data: existing } = await admin
    .from('payments')
    .select('student_id')
    .eq('period', period)
    .in('student_id', studentIds)

  const alreadyHave = new Set((existing ?? []).map((p: any) => p.student_id))
  const toCreate = studentIds.filter((id: string) => !alreadyHave.has(id))

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, message: 'All active students already have a payment for this period.' })
  }

  const rows = toCreate.map((student_id: string) => ({
    student_id,
    amount_cents,
    status: 'pending',
    period,
    due_date: due_date ?? null,
    payment_type: 'tuition',
  }))

  const { error: insertErr } = await admin.from('payments').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ created: toCreate.length, skipped: alreadyHave.size })
}
