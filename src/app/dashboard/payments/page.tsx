export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import { redirect } from 'next/navigation'
import PaymentsDashboard from '@/components/payments/PaymentsDashboard'

export const metadata = { title: 'Payments — KeenKids Enrichment' }

export default async function PaymentsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'teacher') redirect('/dashboard')

  const programId = await getCurrentProgramId()

  // Filter payments through students that belong to the current program
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('program_id', programId ?? '')
    .eq('status', 'active')

  const studentIds = (students ?? []).map(s => s.id)

  const { data: payments } = studentIds.length
    ? await supabase
        .from('payments')
        .select('*, student:students(id, full_name, grade)')
        .in('student_id', studentIds)
        .order('due_date', { ascending: false })
    : { data: [] }

  const collected = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0) ?? 0
  const outstanding = payments?.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount_cents, 0) ?? 0
  const overdue = payments?.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0) ?? 0

  // Find students who haven't paid tuition this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  const paidThisMonth = new Set(
    (payments ?? [])
      .filter(p => p.status === 'paid' && p.paid_at >= monthStart && p.paid_at < monthEnd)
      .map(p => p.student_id)
  )
  const unpaidThisMonth = (students ?? []).filter(s => !paidThisMonth.has(s.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Payments</h1>
        <p className="text-ink-tertiary text-sm mt-1">Enrollment & tuition management</p>
      </div>
      <PaymentsDashboard
        payments={payments ?? []}
        summary={{ collected, outstanding, overdue }}
        students={students ?? []}
        enrolledCount={students?.length ?? 0}
        unpaidThisMonth={unpaidThisMonth}
      />
    </div>
  )
}
