'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import KpiRow from '@/components/layout/KpiRow'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentRecord, PaymentStatus } from '@/types'

interface Props {
  payments: PaymentRecord[]
  summary: { collected: number; outstanding: number; overdue: number }
}

const STATUS_VARIANT: Record<PaymentStatus, any> = {
  paid:    'green',
  pending: 'amber',
  overdue: 'red',
}

export default function PaymentsDashboard({ payments, summary }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [sendingReminders, setSendingReminders] = useState(false)

  const filtered = statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter)

  async function sendReminders() {
    setSendingReminders(true)
    await new Promise(r => setTimeout(r, 1500)) // simulate
    setSendingReminders(false)
  }

  const kpis = [
    { label: 'Collected this month', value: formatCurrency(summary.collected), accent: 'gold' as const },
    { label: 'Outstanding',          value: formatCurrency(summary.outstanding), accent: 'blue' as const },
    { label: 'Overdue',              value: formatCurrency(summary.overdue), accent: 'red' as const },
  ]

  const columns = [
    {
      key: 'family', header: 'Family', width: '160px',
      render: (r: PaymentRecord) => <span className="font-medium">{r.student?.full_name ?? '—'}</span>,
    },
    {
      key: 'amount', header: 'Amount', width: '100px',
      render: (r: PaymentRecord) => formatCurrency(r.amount_cents, r.currency),
    },
    {
      key: 'status', header: 'Status', width: '110px',
      render: (r: PaymentRecord) => <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'due_date', header: 'Due date', width: '120px',
      render: (r: PaymentRecord) => formatDate(r.due_date, 'MMM d, yyyy'),
    },
    {
      key: 'paid_at', header: 'Paid on',
      render: (r: PaymentRecord) => r.paid_at ? formatDate(r.paid_at, 'MMM d, yyyy') : <span style={{ color: '#8A8580' }}>—</span>,
    },
    {
      key: 'actions', header: '', width: '80px',
      render: (r: PaymentRecord) => r.invoice_url
        ? <a href={r.invoice_url} target="_blank" rel="noopener noreferrer" className="text-[11px]" style={{ color: '#B8973A' }}>Invoice →</a>
        : null,
    },
  ]

  return (
    <div className="space-y-5">
      <KpiRow kpis={kpis} />

      <Card>
        <CardHeader
          title="Billing roster"
          action={
            <div className="flex items-center gap-3">
              <div className="flex gap-1 rounded-lg p-0.5" style={{ background: '#F5F0E8' }}>
                {(['all', 'paid', 'pending', 'overdue'] as const).map(s => (
                  <button key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1 rounded-md text-[11.5px] capitalize transition-all"
                    style={{
                      background: statusFilter === s ? '#fff' : 'transparent',
                      color: statusFilter === s ? '#1A1814' : '#8A8580',
                      border: statusFilter === s ? '1px solid rgba(184,151,58,0.32)' : '1px solid transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
              <button className="btn btn-gold text-[12px]" onClick={sendReminders} disabled={sendingReminders}>
                {sendingReminders ? 'Sending…' : 'Send reminders →'}
              </button>
            </div>
          }
        />
        <DataTable columns={columns} data={filtered} emptyMessage="No payment records" />
      </Card>
    </div>
  )
}
