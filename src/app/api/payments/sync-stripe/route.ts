import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLAN_BY_AMOUNT: Record<number, string> = {
  11000: '1-Day Plan',
  23000: '3-Day Plan',
  10000: '5-Day Plan',
  // Legacy / full price (no discount)
  22000: '1-Day Plan',
  45000: '3-Day Plan',
  69900: '5-Day Plan',
}

export async function POST() {
  const admin = createAdminClient()

  // Fetch all students for matching
  const { data: students } = await admin.from('students').select('id, full_name')

  // Pull all completed checkout sessions from Stripe (paginate through all)
  const sessions: Stripe.Checkout.Session[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    const completed = page.data.filter(s => s.payment_status === 'paid')
    sessions.push(...completed)
    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id
  }

  let synced = 0
  let unmatched = 0

  for (const session of sessions) {
    const childNameField = session.custom_fields?.find(
      f => f.label?.custom?.toLowerCase().includes('child') ||
           f.label?.custom?.toLowerCase().includes('student') ||
           f.key?.toLowerCase().includes('child') ||
           f.key?.toLowerCase().includes('student')
    )
    const childName = (childNameField?.text?.value ?? '').trim()
    const amountCents = session.amount_total ?? 0
    const planName = PLAN_BY_AMOUNT[amountCents] ?? `Payment ($${(amountCents / 100).toFixed(2)})`
    const customerEmail = session.customer_details?.email ?? ''
    const customerName = session.customer_details?.name ?? ''
    const paidAt = new Date(session.created * 1000).toISOString()

    let studentId: string | null = null
    if (childName && students) {
      const match = students.find((s: { id: string; full_name: string }) =>
        s.full_name.toLowerCase().replace(/\s+/g, ' ').trim() ===
        childName.toLowerCase().replace(/\s+/g, ' ').trim()
      )
      studentId = match?.id ?? null
    }

    if (!studentId) unmatched++

    await admin.from('payments').upsert({
      stripe_session_id: session.id,
      student_id: studentId,
      amount_cents: amountCents,
      plan_name: planName,
      status: 'paid',
      customer_email: customerEmail,
      customer_name: customerName,
      child_name_entered: childName,
      paid_at: paidAt,
      due_date: paidAt,
    }, { onConflict: 'stripe_session_id' })

    synced++
  }

  return NextResponse.json({ synced, unmatched })
}
