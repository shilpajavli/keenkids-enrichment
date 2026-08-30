import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { extractFields, resolveStudent, PLAN_BY_AMOUNT, inferPeriod, upsertStripePayment } from '@/lib/stripe-student-sync'

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
      .select('id, student_id, status')
      .eq('stripe_session_id', session.id)
      .single()

    if (existing) {
      // Payment already in DB — never overwrite status or re-create deleted students
      // Only link if student_id is null AND we find an existing student by name (no auto-create)
      if (!existing.student_id) {
        const { data: allStudents } = await admin.from('students').select('id, full_name')
        const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
        const match = allStudents?.find((s: { id: string; full_name: string }) => normalized(s.full_name) === normalized(childName))
        if (match) {
          await admin.from('payments').update({ student_id: match.id }).eq('id', existing.id)
        } else {
          unmatched++
        }
      }
      synced++
      continue
    }

    // New session — resolve student and insert
    const studentId = await resolveStudent(admin, childName, schoolName, amountCents)
    if (!studentId) {
      unmatched++
    } else {
      created++
    }

    const paidAt = new Date(session.created * 1000)
    await upsertStripePayment(admin, {
      stripe_session_id: session.id,
      student_id: studentId,
      amount_cents: amountCents,
      plan_name: planName,
      period: inferPeriod(paidAt),
      paid_at: paidAt.toISOString(),
      due_date: paidAt.toISOString(),
      customer_email: session.customer_details?.email ?? '',
      customer_name: session.customer_details?.name ?? '',
      child_name_entered: childName || null,
      school_name_entered: schoolName || null,
      stripe_payment_link: (session as any).payment_link ?? null,
    })
    synced++
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

      const { data: payment, error } = await admin.from('payments')
        .update({
          status: 'refunded',
          refund_amount_cents: refund.amount,
          refunded_at: new Date(refund.created * 1000).toISOString(),
          stripe_refund_id: refund.id,
        })
        .eq('stripe_session_id', sessionId)
        .select('student_id, amount_cents')
        .single()

      if (error) { console.error(`Failed refund ${refund.id}:`, error.message); continue }
      refundsSynced++

      // If full refund, mark student as inactive
      if (payment?.student_id && refund.amount >= payment.amount_cents) {
        await admin.from('students').update({ status: 'inactive' }).eq('id', payment.student_id)
      }
    } catch (e) {
      console.error(`Error processing refund ${refund.id}:`, e)
    }
  }

  // ── 3. Backfill stripe_payment_link for existing records missing it ─────────
  const { data: missingLink } = await admin
    .from('payments')
    .select('id, stripe_session_id')
    .is('stripe_payment_link', null)
    .not('stripe_session_id', 'is', null)

  for (const row of missingLink ?? []) {
    try {
      const s = await stripe.checkout.sessions.retrieve(row.stripe_session_id)
      const plink = (s as any).payment_link ?? null
      if (plink) {
        await admin.from('payments').update({ stripe_payment_link: plink }).eq('id', row.id)
      }
    } catch {}
  }

  return NextResponse.json({ synced, unmatched, created, refunds: refundsSynced, total: sessions.length })
}
