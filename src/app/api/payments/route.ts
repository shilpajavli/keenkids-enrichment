import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// GET — list payments
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('payments')
    .select('*, student:students(id, full_name)')
    .order('due_date', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST — create Stripe payment link for a student
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, amount_cents, due_date, currency = 'usd' } = await req.json()

  // Create Stripe PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount: amount_cents,
    currency,
    metadata: { student_id, portal: 'luminary-scholars' },
  })

  // Save to DB
  const { data, error } = await supabase
    .from('payments')
    .insert({
      parent_id: session.user.id,
      student_id,
      amount_cents,
      currency,
      status: 'pending',
      due_date,
      stripe_payment_intent_id: intent.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data, client_secret: intent.client_secret }, { status: 201 })
}
