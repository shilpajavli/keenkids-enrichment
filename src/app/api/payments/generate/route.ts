import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { period, due_date, program_id } = await req.json()
  if (!period || !program_id) {
    return NextResponse.json({ error: 'period and program_id are required' }, { status: 400 })
  }

  // Amount by session_day (monthly tuition rates)
  const AMOUNT_BY_DAY: Record<number, number> = {
    1: 22000,  // $220
    3: 45000,  // $450
    5: 69900,  // $699
  }

  const admin = createAdminClient()

  // Get all active students in this program with their session_day
  const { data: students, error: studentsErr } = await admin
    .from('students')
    .select('id, session_day')
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
  const toCreate = (students ?? []).filter((s: any) => !alreadyHave.has(s.id))

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, message: 'All active students already have a payment for this period.' })
  }

  const rows = toCreate.map((s: any) => ({
    student_id: s.id,
    amount_cents: AMOUNT_BY_DAY[s.session_day as number] ?? 69900,
    status: 'pending',
    period,
    due_date: due_date ?? null,
    payment_type: 'tuition',
  }))

  const { error: insertErr } = await admin.from('payments').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ created: toCreate.length, skipped: alreadyHave.size })
}
