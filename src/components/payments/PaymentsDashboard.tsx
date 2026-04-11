'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
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

export default function PaymentsDashboard({ payments: initial, summary: initialSummary }: Props) {
  const [payments, setPayments] = useState(initial)
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [marking, setMarking] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState<string | null>(null)
  const [amountInput, setAmountInput] = useState('')

  const filtered = statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter)

  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const outstanding = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount_cents, 0)
  const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0)

  async function markPaid(id: string) {
    setMarking(id)
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'paid' }),
    })
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p))
    setMarking(null)
  }

  async function updateAmount(id: string) {
    const cents = Math.round(parseFloat(amountInput) * 100)
    if (!cents || isNaN(cents)) return
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: payments.find(p => p.id === id)?.status, amount_cents: cents }),
    })
    setPayments(prev => prev.map(p => p.id === id ? { ...p, amount_cents: cents } : p))
    setEditingAmount(null)
  }

  const kpis = [
    { label: 'Collected', value: formatCurrency(collected), color: '#27500A', bg: '#EAF3DE' },
    { label: 'Outstanding', value: formatCurrency(outstanding), color: '#633806', bg: '#FAEEDA' },
    { label: 'Overdue', value: formatCurrency(overdue), color: '#791F1F', bg: '#FCEBEB' },
  ]

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="card p-5">
            <div className="font-serif text-2xl font-light mb-1" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[12px]" style={{ color: '#8A8580' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Billing roster"
          action={
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: '#F5F0E8' }}>
              {(['all', 'paid', 'pending', 'overdue'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
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
          }
        />
        <div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No payment records</div>
          )}
          {filtered.map((r, i) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>

              {/* Name */}
              <div className="w-40 text-[13px] font-medium">{r.student?.full_name ?? '—'}</div>

              {/* Amount — click to edit */}
              <div className="w-28">
                {editingAmount === r.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[12px]" style={{ color: '#8A8580' }}>$</span>
                    <input
                      className="input text-[12px] w-16 py-1"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') updateAmount(r.id); if (e.key === 'Escape') setEditingAmount(null) }}
                      autoFocus
                    />
                    <button onClick={() => updateAmount(r.id)} className="text-[11px]" style={{ color: '#B8973A' }}>✓</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingAmount(r.id); setAmountInput((r.amount_cents / 100).toFixed(0)) }}
                    className="text-[13px] hover:underline text-left"
                    style={{ color: '#1A1814' }}>
                    {formatCurrency(r.amount_cents, r.currency)}
                  </button>
                )}
              </div>

              {/* Status */}
              <div className="w-24">
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </div>

              {/* Due date */}
              <div className="text-[12px] w-28" style={{ color: '#8A8580' }}>{formatDate(r.due_date, 'MMM d, yyyy')}</div>

              {/* Paid on */}
              <div className="flex-1 text-[12px]" style={{ color: '#8A8580' }}>
                {r.paid_at ? `Paid ${formatDate(r.paid_at, 'MMM d')}` : '—'}
              </div>

              {/* Action */}
              {r.status !== 'paid' && (
                <button
                  onClick={() => markPaid(r.id)}
                  disabled={marking === r.id}
                  className="btn btn-gold text-[11px] py-1 px-3">
                  {marking === r.id ? 'Saving…' : '✓ Mark paid'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
