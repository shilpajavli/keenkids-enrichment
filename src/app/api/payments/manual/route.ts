import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST — create a manual payment record (admin/teacher only)
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { student_id, period, amount_cents, paid_at, program_id } = await req.json()
  if (!student_id || !period) return NextResponse.json({ error: 'student_id and period required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .insert({
      student_id,
      period,
      amount_cents: amount_cents ?? 69900,
      status: 'paid',
      paid_at: paid_at ?? new Date().toISOString(),
      due_date: new Date().toISOString(),
      program_id: program_id ?? null,
    })
    .select('*, student:students(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
