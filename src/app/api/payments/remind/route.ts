import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const STRIPE_LINKS: Record<string, string> = {
  '5_day': 'https://buy.stripe.com/fZu3co3pf6zT1MHg1me3e02',
  '3_day': 'https://buy.stripe.com/14A28k1h7aQ9dvp6qMe3e04',
  '1_day': 'https://buy.stripe.com/3cIcMYbVLf6p8b57uQe3e03',
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get all pending/overdue payments with student + enrollment info
  const { data: payments, error } = await admin
    .from('payments')
    .select('*, student:students(id, full_name, enrollment_type, parent_id)')
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by parent_id and collect their email from profiles
  const parentIds = [...new Set((payments ?? []).map((p: any) => p.student?.parent_id).filter(Boolean))]

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', parentIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  // Build grouped summary per parent
  const grouped: Record<string, {
    parentEmail: string
    parentName: string
    studentName: string
    enrollmentType: string
    stripeLink: string
    totalOwedCents: number
    payments: { amount_cents: number; due_date: string; status: string }[]
  }> = {}

  for (const p of payments ?? []) {
    const parentId = p.student?.parent_id
    if (!parentId) continue
    const profile = profileMap[parentId]
    if (!profile?.email) continue

    if (!grouped[parentId]) {
      grouped[parentId] = {
        parentEmail: profile.email,
        parentName: profile.full_name ?? profile.email.split('@')[0],
        studentName: p.student?.full_name ?? '',
        enrollmentType: p.student?.enrollment_type ?? '',
        stripeLink: STRIPE_LINKS[p.student?.enrollment_type ?? ''] ?? '',
        totalOwedCents: 0,
        payments: [],
      }
    }
    grouped[parentId].totalOwedCents += p.amount_cents
    grouped[parentId].payments.push({
      amount_cents: p.amount_cents,
      due_date: p.due_date,
      status: p.status,
    })
  }

  return NextResponse.json({ data: Object.values(grouped) })
}
