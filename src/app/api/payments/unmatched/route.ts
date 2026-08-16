import { createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payments')
    .select('*')
    .is('student_id', null)
    .not('stripe_session_id', 'is', null)
    .neq('status', 'cancelled')
    .order('paid_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const { payment_id, student_id } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('payments')
    .update({ student_id })
    .eq('id', payment_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
