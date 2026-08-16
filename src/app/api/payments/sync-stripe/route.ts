import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLAN_BY_AMOUNT: Record<number, string> = {
  11000: '1-Day Plan',
  23000: '3-Day Plan',
  10000: '5-Day Plan',
  22000: '1-Day Plan',
  45000: '3-Day Plan',
  69900: '5-Day Plan',
}

function matchStudent(childName: string, students: { id: string; full_name: string }[]): string | null {
  if (!childName) return null
  const normalized = childName.toLowerCase().replace(/\s+/g, ' ').trim()
  return students.find(s =>
    s.full_name.toLowerCase().replace(/\s+/g, ' ').trim() === normalized
  )?.id ?? null
}

export async function POST() {
  const admin = createAdminClient()
  const { data: students } = await admin.from('students').select('id, full_name')
  const studentList = students ?? []

  // ── 1. Sync completed checkout sessions ──────────────────────────────────
  const sessions: Stripe.Checkout.Session[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    sessions.push(...page.data.filter(s => s.payment_status === 'paid'))
    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id
  }

  let synced = 0, unmatched = 0

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
    const studentId = matchStudent(childName, studentList)
    if (!studentId) unmatched++

    const { error } = await admin.from('payments').upsert({
      stripe_session_id: session.id,
      student_id: studentId,
      amount_cents: amountCents,
      plan_name: planName,
      status: 'paid',
      customer_email: session.customer_details?.email ?? '',
      customer_name: session.customer_details?.name ?? '',
      child_name_entered: childName || null,
      paid_at: new Date(session.created * 1000).toISOString(),
      due_date: new Date(session.created * 1000).toISOString(),
    }, { onConflict: 'stripe_session_id' })

    if (error) console.error(`Failed session ${session.id}:`, error.message)
    else synced++
  }

  // ── 2. Sync refunds ───────────────────────────────────────────────────────
  const refunds: Stripe.Refund[] = []
  let refundHasMore = true
  let refundCursor: string | undefined = undefined

  while (refundHasMore) {
    const refundPage: Stripe.ApiList<Stripe.Refund> = await stripe.refunds.list({
      limit: 100,
      ...(refundCursor ? { starting_after: refundCursor } : {}),
    })
    refunds.push(...refundPage.data)
    refundHasMore = refundPage.has_more
    if (refundPage.data.length > 0) refundCursor = refundPage.data[refundPage.data.length - 1].id
  }

  let refundsSynced = 0

  for (const refund of refunds) {
    try {
      // Expand the charge to get payment_intent
      const charge = await stripe.charges.retrieve(refund.charge as string)
      const paymentIntentId = charge.payment_intent as string
      if (!paymentIntentId) continue

      // Find checkout session via payment_intent
      const sessionList = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      })
      const sessionId = sessionList.data[0]?.id
      if (!sessionId) continue

      const { error } = await admin.from('payments')
        .update({
          status: 'refunded',
          refund_amount_cents: refund.amount,
          refunded_at: new Date(refund.created * 1000).toISOString(),
          stripe_refund_id: refund.id,
        })
        .eq('stripe_session_id', sessionId)

      if (error) console.error(`Failed refund ${refund.id}:`, error.message)
      else refundsSynced++
    } catch (e) {
      console.error(`Error processing refund ${refund.id}:`, e)
    }
  }

  return NextResponse.json({ synced, unmatched, refunds: refundsSynced, total: sessions.length })
}
