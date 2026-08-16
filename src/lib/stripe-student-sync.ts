import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'

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

  if (match) {
    // Re-activate if inactive
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

    const school = schools?.find(s => normalized(s.name).includes(normalized(schoolName)) ||
      normalized(schoolName).includes(normalized(s.name)))

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

  console.log(`Auto-creating student: "${childName}", school: "${schoolName}", programId: ${programId}, days: ${sessionDays}`)

  const { data: newStudent, error } = await admin
    .from('students')
    .insert({
      full_name: childName,
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
