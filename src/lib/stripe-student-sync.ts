import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'

// Payment collected in month X → next month's tuition period
export function inferPeriod(paidAt: Date): string {
  const next = new Date(paidAt)
  next.setMonth(next.getMonth() + 1)
  return next.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

// Upsert a payment: if a pending record exists for same student+period, mark it paid.
// Otherwise upsert by stripe_session_id.
export async function upsertStripePayment(
  admin: SupabaseClient,
  fields: {
    stripe_session_id: string
    student_id: string | null
    amount_cents: number
    plan_name: string
    period: string
    paid_at: string
    due_date: string
    customer_email: string
    customer_name: string
    child_name_entered: string | null
    school_name_entered?: string | null
    stripe_payment_link?: string | null
  }
) {
  // Try to find an existing pending/overdue record for this student + period
  if (fields.student_id && fields.period) {
    const { data: pending } = await admin
      .from('payments')
      .select('id')
      .eq('student_id', fields.student_id)
      .eq('period', fields.period)
      .in('status', ['pending', 'overdue'])
      .maybeSingle()

    if (pending) {
      // Merge: update the existing pending row to paid
      await admin.from('payments').update({
        status: 'paid',
        stripe_session_id: fields.stripe_session_id,
        amount_cents: fields.amount_cents,
        plan_name: fields.plan_name,
        paid_at: fields.paid_at,
        customer_email: fields.customer_email,
        customer_name: fields.customer_name,
        stripe_payment_link: fields.stripe_payment_link ?? null,
      }).eq('id', pending.id)
      return
    }
  }

  // No pending record — upsert by stripe_session_id
  await admin.from('payments').upsert(fields, { onConflict: 'stripe_session_id' })
}

export const PLAN_BY_AMOUNT: Record<number, string> = {
  11000: '1-Day Plan',
  23000: '3-Day Plan',
  10000: '5-Day Plan',
  22000: '1-Day Plan',
  45000: '3-Day Plan',
  69900: '5-Day Plan',
}

export function extractFields(session: Stripe.Checkout.Session) {
  const fields = session.custom_fields ?? []

  const childNameField = fields.find(
    f => f.label?.custom?.toLowerCase().includes('child') ||
         f.label?.custom?.toLowerCase().includes('student') ||
         f.key?.toLowerCase().includes('child') ||
         f.key?.toLowerCase().includes('student')
  )
  const schoolField = fields.find(
    (_, i) => i === 1 // second custom field is school
  ) ?? fields.find(
    f => f.label?.custom?.toLowerCase().includes('school') ||
         f.key?.toLowerCase().includes('school')
  )

  return {
    childName: (childNameField?.text?.value ?? '').trim(),
    schoolName: (schoolField?.text?.value ?? '').trim(),
  }
}

export async function resolveStudent(
  admin: SupabaseClient,
  childName: string,
  schoolName: string,
  amountCents: number,
): Promise<string | null> {
  if (!childName) return null

  const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

  // 1. Try exact name match
  const { data: allStudents } = await admin
    .from('students')
    .select('id, full_name, status, program_id')

  const match = allStudents?.find(s => normalized(s.full_name) === normalized(childName))
  console.log(`Matching "${childName}" → ${match ? `found: ${match.full_name}` : 'no match'} (total students: ${allStudents?.length})`)

  if (match) {
    if (match.status === 'inactive') {
      await admin.from('students').update({ status: 'active' }).eq('id', match.id)
    }
    return match.id
  }

  // 2. No match — auto-create student
  // Find the program by school name
  let programId: string | null = null
  if (schoolName) {
    const { data: schools } = await admin
      .from('schools')
      .select('id, name')

    // Match school by key words — handle variations like "Mabel Mattos Elementary School", "John Sinnott ( 3rd Grade )" etc.
    const schoolKeywords = (s: string) => normalized(s).replace(/elementary|school|grade|\d+|[()]/g, '').trim()
    const school = schools?.find(s =>
      schoolKeywords(s.name).split(' ').some(w => w.length > 3 && schoolKeywords(schoolName).includes(w)) ||
      schoolKeywords(schoolName).split(' ').some(w => w.length > 3 && schoolKeywords(s.name).includes(w))
    )

    if (school) {
      // Find the active/latest program for this school
      const today = new Date().toISOString().slice(0, 10)
      const { data: programs } = await admin
        .from('programs')
        .select('id, school_id, start_date')
        .order('start_date', { ascending: false })

      // Try active program first, then latest
      const program = programs?.find(p => p.school_id === school.id) ?? null
      programId = program?.id ?? null
    }
  }

  // If still no program, use the most recently active one
  if (!programId) {
    const { data: programs } = await admin
      .from('programs')
      .select('id')
      .order('start_date', { ascending: false })
      .limit(1)
    programId = programs?.[0]?.id ?? null
  }

  const planName = PLAN_BY_AMOUNT[amountCents] ?? ''
  const sessionDays = planName.includes('5') ? 5 : planName.includes('3') ? 3 : 1

  // Split name into first/last (full_name is a generated column)
  const nameParts = childName.trim().split(/\s+/)
  const firstName = nameParts[0] ?? childName
  const lastName = nameParts.slice(1).join(' ') || ''

  console.log(`Auto-creating student: "${childName}", school: "${schoolName}", programId: ${programId}, days: ${sessionDays}`)

  const { data: newStudent, error } = await admin
    .from('students')
    .insert({
      first_name: firstName,
      last_name: lastName,
      grade: 0,
      program_id: programId,
      status: 'active',
      session_day: sessionDays,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to auto-create student "${childName}":`, error.message, error.details, error.hint)
    return null
  }

  console.log(`✓ Auto-created student: ${childName} → ${newStudent.id}`)
  return newStudent.id
}
