import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { extractFields, resolveStudent, PLAN_BY_AMOUNT } from '@/lib/stripe-student-sync'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const admin = createAdminClient()

  // ── 1. Sync completed checkout sessions ──────────────────────────────────
  const sessions: Stripe.Checkout.Session[] = []
  let hasMore = true
  let cursor: string | undefined

  while (hasMore) {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      ...(cursor ? { starting_after: cursor } : {}),
    })
    sessions.push(...page.data.filter(s => s.payment_status === 'paid'))
    hasMore = page.has_more
    if (page.data.length > 0) cursor = page.data[page.data.length - 1].id
  }

  let synced = 0, unmatched = 0, created = 0

  for (const session of sessions) {
    const { childName, schoolName } = extractFields(session)
    const amountCents = session.amount_total ?? 0
    const planName = PLAN_BY_AMOUNT[amountCents] ?? `Payment ($${(amountCents / 100).toFixed(2)})`

    // Check if payment already exists
    const { data: existing } = await admin
      .from('payments')
      .select('id, student_id')
      .eq('stripe_session_id', session.id)
      .single()

    let studentId: string | null = existing?.student_id ?? null

    // Only resolve student if not already linked
    if (!studentId) {
      studentId = await resolveStudent(admin, childName, schoolName, amountCents)
      if (!studentId) {
        unmatched++
        console.log(`Still unmatched: "${childName}" school="${schoolName}"`)
      } else {
        created++
      }
    }

    const record = {
      stripe_session_id: session.id,
      student_id: studentId,
      amount_cents: amountCents,
      plan_name: planName,
      status: 'paid',
      customer_email: session.customer_details?.email ?? '',
      customer_name: session.customer_details?.name ?? '',
      child_name_entered: childName || null,
      school_name_entered: schoolName || null,
      paid_at: new Date(session.created * 1000).toISOString(),
      due_date: new Date(session.created * 1000).toISOString(),
    }

    const { error } = existing
      ? await admin.from('payments').update(record).eq('id', existing.id)
      : await admin.from('payments').insert(record)

    if (error) console.error(`Failed session ${session.id}:`, error.message)
    else synced++
  }

  // ── 2. Sync refunds ───────────────────────────────────────────────────────
  const refunds: Stripe.Refund[] = []
  let refundHasMore = true
  let refundCursor: string | undefined

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
      const charge = await stripe.charges.retrieve(refund.charge as string)
      const paymentIntentId = charge.payment_intent as string
      if (!paymentIntentId) continue

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

  return NextResponse.json({ synced, unmatched, created, refunds: refundsSynced, total: sessions.length })
}
