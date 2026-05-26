import { createServerClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import PaymentsDashboard from '@/components/payments/PaymentsDashboard'

export const metadata = { title: 'Payments — KeenKids Enrichment' }

export default async function PaymentsPage() {
  const supabase = await createServerClient()
  const programId = await getCurrentProgramId()

  // Filter payments through students that belong to the current program
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('program_id', programId ?? '')

  const studentIds = (students ?? []).map(s => s.id)

  const { data: payments } = studentIds.length
    ? await supabase
        .from('payments')
        .select('*, student:students(id, full_name)')
        .in('student_id', studentIds)
        .order('due_date', { ascending: false })
    : { data: [] }

  const collected = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0) ?? 0
  const outstanding = payments?.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount_cents, 0) ?? 0
  const overdue = payments?.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Payments</h1>
        <p className="text-ink-tertiary text-sm mt-1">Enrollment & tuition management</p>
      </div>
      <PaymentsDashboard
        payments={payments ?? []}
        summary={{ collected, outstanding, overdue }}
      />
    </div>
  )
}
