export const dynamic = 'force-dynamic'

import { createAdminClient, createServerClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import PrintTrigger from './PrintTrigger'

export default async function ReceiptPage({ params }: { params: { studentId: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('id, full_name, grade, school:schools(name), program:programs(name)')
    .eq('id', params.studentId)
    .single()

  if (!student) notFound()

  const { data: payments } = await admin
    .from('payments')
    .select('*')
    .eq('student_id', params.studentId)
    .in('status', ['paid', 'refunded'])
    .order('paid_at', { ascending: true })

  const totalPaid = (payments ?? []).reduce((s: number, p: any) => s + (p.status === 'paid' ? p.amount_cents : 0), 0)
  const totalRefunded = (payments ?? []).reduce((s: number, p: any) => s + (p.status === 'refunded' ? (p.refund_amount_cents ?? p.amount_cents) : 0), 0)

  const gradeLabel = (g: number) => g === 0 ? 'Kindergarten' : `Grade ${g}`
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <PrintTrigger />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, 'Times New Roman', serif; color: #1A1814; background: white; }
        .receipt { padding: 48px; max-width: 680px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-family: Arial, sans-serif; font-size: 13px; }
        th { text-align: left; padding: 8px 12px; background: #F5F0E8; color: #4A4640; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 12px; border-bottom: 1px solid #EDE8E0; }
        tr:last-child td { border-bottom: none; }
        @media print { @page { margin: 0.5in; } }
      `}</style>
      <div className="receipt">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 24, borderBottom: '2px solid #1A1814' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>KeenKids Enrichment</div>
            <div style={{ fontSize: 12, color: '#8A8580', marginTop: 3, fontFamily: 'Arial, sans-serif' }}>After School Enrichment Program</div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#8A8580' }}>Payment Receipt</div>
            <div style={{ fontSize: 13, color: '#4A4640', marginTop: 4 }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Student */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A8580', marginBottom: 8 }}>Prepared for</div>
          <div style={{ fontSize: 20 }}>{student.full_name}</div>
          <div style={{ fontSize: 13, fontFamily: 'Arial, sans-serif', color: '#4A4640', marginTop: 4 }}>
            {gradeLabel(student.grade)}
            {(student.school as any)?.name ? ` · ${(student.school as any).name}` : ''}
            {(student.program as any)?.name ? ` · ${(student.program as any).name} Program` : ''}
          </div>
        </div>

        {/* Payments table */}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p: any) => (
              <tr key={p.id}>
                <td style={{ color: '#4A4640', fontFamily: 'Arial, sans-serif' }}>{fmtDate(p.paid_at ?? p.due_date)}</td>
                <td>{p.plan_name || 'Tuition'}{p.payment_type === 'enrollment' ? ' (Enrollment Fee)' : ''}</td>
                <td style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
                  {p.status === 'refunded' ? `−${fmt(p.refund_amount_cents ?? p.amount_cents)}` : fmt(p.amount_cents)}
                </td>
                <td style={{ textAlign: 'right', color: p.status === 'refunded' ? '#7C3AED' : '#27500A', fontSize: 12, fontFamily: 'Arial, sans-serif' }}>
                  {p.status === 'refunded' ? 'Refunded' : 'Paid'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '2px solid #1A1814', paddingTop: 16, fontFamily: 'Arial, sans-serif' }}>
          {totalRefunded > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: 13, color: '#4A4640' }}>
              <span>Total paid</span><span>{fmt(totalPaid)}</span>
            </div>
          )}
          {totalRefunded > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: 13, color: '#7C3AED' }}>
              <span>Total refunded</span><span>−{fmt(totalRefunded)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 15, fontWeight: 'bold', marginTop: 8, borderTop: '1px solid #EDE8E0' }}>
            <span>Net paid</span><span>{fmt(totalPaid - totalRefunded)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #EDE8E0', fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#8A8580', textAlign: 'center' }}>
          Thank you for being part of KeenKids Enrichment · keenkidsenrichment@gmail.com
        </div>
      </div>
    </>
  )
}
