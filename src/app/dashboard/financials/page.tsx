export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FinancialsDashboard from '@/components/financials/FinancialsDashboard'

export const metadata = { title: 'Financials — KeenKids Enrichment' }

export default async function FinancialsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: payments }, { data: timeEntries }] = await Promise.all([
    admin
      .from('payments')
      .select('amount_cents, status, payment_type, paid_at, due_date, refund_amount_cents')
      .order('due_date', { ascending: false }),
    admin
      .from('time_entries')
      .select('hours, hourly_rate, date, status, teacher:profiles!teacher_id(id, full_name)')
      .eq('status', 'approved'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Financials</h1>
        <p className="text-ink-tertiary text-sm mt-1">Revenue, payroll & net income across all programs</p>
      </div>
      <FinancialsDashboard payments={payments ?? []} timeEntries={(timeEntries ?? []) as any} />
    </div>
  )
}
