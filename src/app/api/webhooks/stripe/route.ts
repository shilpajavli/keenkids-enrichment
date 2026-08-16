import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { extractFields, resolveStudent, PLAN_BY_AMOUNT } from '@/lib/stripe-student-sync'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature error:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true })
  }

  const admin = createAdminClient()
  const { childName, schoolName } = extractFields(session)
  const amountCents = session.amount_total ?? 0
  const planName = PLAN_BY_AMOUNT[amountCents] ?? `Payment ($${(amountCents / 100).toFixed(2)})`

  const studentId = await resolveStudent(admin, childName, schoolName, amountCents)

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

  if (error) {
    console.error('Failed to save payment:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
