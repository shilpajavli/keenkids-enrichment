export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from '@/lib/supabase-server'
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
  const admin = createAdminClient()

  const [{ data: activeStudents }, { data: allStudents }] = await Promise.all([
    admin.from('students').select('id, full_name, enrollment_type, session_day').eq('program_id', programId ?? '').eq('status', 'active').order('full_name'),
    admin.from('students').select('id, full_name').eq('program_id', programId ?? '').in('status', ['active', 'inactive']),
  ])

  const studentIds = (allStudents ?? []).map((s: any) => s.id)

  const { data: payments } = studentIds.length
    ? await admin
        .from('payments')
        .select('*, student:students(id, full_name, grade)')
        .in('student_id', studentIds)
        .order('due_date', { ascending: false })
    : { data: [] }

  const collected = payments?.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount_cents, 0) ?? 0
  const outstanding = payments?.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + p.amount_cents, 0) ?? 0
  const overdue = payments?.filter((p: any) => p.status === 'overdue').reduce((s: number, p: any) => s + p.amount_cents, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Payments</h1>
        <p className="text-ink-tertiary text-sm mt-1">Enrollment & tuition management</p>
      </div>
      <PaymentsDashboard
        payments={payments ?? []}
        summary={{ collected, outstanding, overdue }}
        students={allStudents ?? []}
        activeStudents={activeStudents ?? []}
        enrolledCount={activeStudents?.length ?? 0}
        programId={programId ?? undefined}
      />
    </div>
  )
}
