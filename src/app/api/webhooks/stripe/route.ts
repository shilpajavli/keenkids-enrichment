import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Map Stripe Payment Link IDs to plan names
const PLAN_MAP: Record<string, { name: string; days: number; amount_cents: number }> = {
  // These will be auto-detected from the payment amount if not matched by link ID
}

const PLAN_BY_AMOUNT: Record<number, string> = {
  11000: '1-Day Plan',
  23000: '3-Day Plan',
  10000: '5-Day Plan',
  // Legacy / full price (no discount)
  22000: '1-Day Plan',
  45000: '3-Day Plan',
  69900: '5-Day Plan',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
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

  // Extract child's name from custom fields
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

  const admin = createAdminClient()

  // Try to match student by child name (fuzzy: case-insensitive, trimmed)
  let studentId: string | null = null
  if (childName) {
    const { data: students } = await admin
      .from('students')
      .select('id, full_name')

    const match = students?.find((s: { id: string; full_name: string }) =>
      s.full_name.toLowerCase().replace(/\s+/g, ' ').trim() ===
      childName.toLowerCase().replace(/\s+/g, ' ').trim()
    )
    studentId = match?.id ?? null
  }

  // Upsert payment record (idempotent by stripe_session_id)
  const { error } = await admin.from('payments').upsert({
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

  if (error) {
    console.error('Failed to save payment:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
