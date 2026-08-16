'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentRecord, PaymentStatus } from '@/types'

interface UnmatchedPayment {
  id: string
  child_name_entered: string
  customer_email: string
  customer_name: string
  amount_cents: number
  plan_name: string
  paid_at: string
}

interface StudentOption {
  id: string
  full_name: string
}

interface Props {
  payments: PaymentRecord[]
  summary: { collected: number; outstanding: number; overdue: number }
  students?: StudentOption[]
  enrolledCount?: number
  unpaidThisMonth?: StudentOption[]
}

const STATUS_VARIANT: Record<PaymentStatus, any> = {
  paid: 'green',
  pending: 'amber',
  overdue: 'red',
  refunded: 'gray',
  cancelled: 'gray',
}

const TYPE_LABELS: Record<string, string> = {
  enrollment: 'Enrollment',
  tuition: 'Tuition',
  prorated: 'Prorated',
  other: 'Other',
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  enrollment: { bg: '#DCF0FF', color: '#006FFF' },
  tuition:    { bg: '#EFE6CC', color: '#8A6E25' },
  prorated:   { bg: '#F0E8FF', color: '#7C3AED' },
  other:      { bg: '#F5F0E8', color: '#8A8580' },
}

const PAGE_SIZE = 20

// Group payments by student
function groupByStudent(payments: PaymentRecord[]) {
  const map = new Map<string, { name: string; payments: PaymentRecord[]; totalPaid: number; totalOwed: number; totalRefunded: number; hasCancelled: boolean }>()

  for (const p of payments) {
    const key = p.student?.id ?? `unlinked-${p.id}`
    const name = p.student?.full_name ?? p.child_name_entered ?? 'Unknown'
    if (!map.has(key)) map.set(key, { name, payments: [], totalPaid: 0, totalOwed: 0, totalRefunded: 0, hasCancelled: false })
    const entry = map.get(key)!
    entry.payments.push(p)
    if (p.status === 'paid') entry.totalPaid += p.amount_cents
    else if (p.status === 'pending' || p.status === 'overdue') entry.totalOwed += p.amount_cents
    else if (p.status === 'refunded') entry.totalRefunded += (p.refund_amount_cents ?? p.amount_cents)
    else if (p.status === 'cancelled') entry.hasCancelled = true
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function PaymentsDashboard({ payments: initial, students = [], enrolledCount, unpaidThisMonth = [] }: Props) {
  const [payments, setPayments] = useState(initial)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; unmatched: number; created: number; refunds: number; total: number } | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelNotes, setCancelNotes] = useState<Record<string, string>>({})
  const [unmatched, setUnmatched] = useState<UnmatchedPayment[]>([])
  const [linking, setLinking] = useState<string | null>(null)
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({})

  const loadUnmatched = useCallback(() => {
    fetch('/api/payments/unmatched').then(r => r.json()).then(j => setUnmatched(j.data ?? []))
  }, [])

  useEffect(() => { loadUnmatched() }, [loadUnmatched])

  async function syncStripe() {
    setSyncing(true); setSyncResult(null)
    const res = await fetch('/api/payments/sync-stripe', { method: 'POST' })
    setSyncResult(await res.json())
    loadUnmatched()
    setSyncing(false)
  }

  async function cancelPayment(id: string, studentId: string | null) {
    const note = window.prompt('Cancellation reason (optional):') ?? ''
    setCancelling(id)

    // Mark payment cancelled
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status: 'cancelled',
        cancellation_notes: note,
        cancelled_at: new Date().toISOString(),
      }),
    })
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' as PaymentStatus } : p))

    // Automatically mark student inactive
    if (studentId) {
      await fetch(`/api/students?id=${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      })
    }
    setCancelling(null)
  }

  async function linkStudent(paymentId: string) {
    const studentId = linkSelections[paymentId]
    if (!studentId) return
    setLinking(paymentId)
    await fetch('/api/payments/unmatched', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, student_id: studentId }),
    })
    setUnmatched(prev => prev.filter(p => p.id !== paymentId))
    setLinking(null)
  }

  async function updatePayment(id: string, patch: Partial<PaymentRecord>) {
    setUpdating(id)
    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    setUpdating(null)
  }

  const grouped = groupByStudent(payments)
  const totalPages = Math.ceil(grouped.length / PAGE_SIZE)
  const pageItems = grouped.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const totalOwed = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0)

  function toggleExpand(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#27500A' }}>{formatCurrency(totalPaid)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Collected</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#633806' }}>{formatCurrency(totalOwed)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Outstanding</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#7C3AED' }}>
            {formatCurrency(payments.reduce((s, p) => s + (p.status === 'refunded' ? (p.refund_amount_cents ?? p.amount_cents) : 0), 0))}
          </div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Refunded · {payments.filter(p => p.status === 'refunded').length} payments</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#1A1814' }}>{enrolledCount ?? students.length}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Enrolled students</div>
        </div>
      </div>

      {/* Sync button */}
      <div className="flex items-center gap-3">
        <button onClick={syncStripe} disabled={syncing}
          className="btn text-[11.5px] py-1.5 px-4 flex items-center gap-1.5 disabled:opacity-50"
          style={{ background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
          {syncing ? 'Syncing…' : '↓ Sync past payments from Stripe'}
        </button>
        {syncResult && (
          <span className="text-[12px]" style={{ color: '#4A4640' }}>
            ✓ {syncResult.synced} synced · {syncResult.created ?? 0} new students · {syncResult.unmatched} unmatched · {syncResult.refunds ?? 0} refunds
          </span>
        )}
      </div>

      {/* Unpaid this month */}
      {unpaidThisMonth.length > 0 && (
        <div className="card overflow-hidden" style={{ border: '1.5px solid rgba(239,68,68,0.25)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#FFF5F5', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
            <div>
              <h3 className="font-medium text-sm" style={{ color: '#1A1814' }}>
                ⚠ Not paid this month ({unpaidThisMonth.length})
              </h3>
              <p className="text-xs mt-0.5" style={{ color: '#8A8580' }}>
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} — no payment recorded
              </p>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(239,68,68,0.08)' }}>
            {unpaidThisMonth.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{s.full_name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>Unpaid</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched Stripe payments */}
      {unmatched.length > 0 && (
        <div className="card overflow-hidden" style={{ border: '1.5px solid rgba(251,188,5,0.4)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#FFFBEA', borderBottom: '1px solid rgba(251,188,5,0.2)' }}>
            <div>
              <h3 className="font-medium text-sm" style={{ color: '#1A1814' }}>⚠ Unmatched Stripe Payments ({unmatched.length})</h3>
              <p className="text-xs mt-0.5" style={{ color: '#8A8580' }}>Child name didn't match a student — link them below</p>
            </div>
          </div>
          {unmatched.map((p, i) => (
            <div key={p.id} className="px-5 py-4"
              style={{ borderBottom: i < unmatched.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>
                    Child entered: <span style={{ color: '#791F1F' }}>"{p.child_name_entered || '—'}"</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: '#8A8580' }}>
                    {p.customer_name} · {p.customer_email} · {p.plan_name} · ${(p.amount_cents / 100).toFixed(0)} · {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={linkSelections[p.id] ?? ''}
                    onChange={e => setLinkSelections(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814', minWidth: 160 }}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                  <button onClick={() => linkStudent(p.id)} disabled={!linkSelections[p.id] || linking === p.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: '#1A1814', color: '#B8973A' }}>
                    {linking === p.id ? 'Linking…' : 'Link'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student payment roster */}
      <Card>
        <CardHeader
          title={`Payment history · ${grouped.length} students`}
          action={
            totalPages > 1 ? (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#8A8580' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[#F5F0E8]">←</button>
                <span>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[#F5F0E8]">→</button>
              </div>
            ) : null
          }
        />
        <div>
          {pageItems.length === 0 && (
            <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No payment records</div>
          )}
          {pageItems.map((group, gi) => {
            const isOpen = expanded.has(group.name)
            return (
              <div key={group.name} style={{ borderBottom: gi < pageItems.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
                {/* Student summary row */}
                <button onClick={() => toggleExpand(group.name)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAF7F2] transition-colors text-left">
                  <div className="flex-1 text-[13px] font-medium flex items-center gap-2" style={{ color: '#1A1814' }}>
                    {group.name}
                    {group.hasCancelled && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#791F1F' }}>Cancelled</span>}
                  </div>
                  {group.totalPaid > 0 && <div className="text-[12px]" style={{ color: '#27500A' }}>{formatCurrency(group.totalPaid)} paid</div>}
                  {group.totalOwed > 0 && <div className="text-[12px]" style={{ color: '#791F1F' }}>{formatCurrency(group.totalOwed)} owed</div>}
                  {group.totalRefunded > 0 && <div className="text-[12px]" style={{ color: '#7C3AED' }}>−{formatCurrency(group.totalRefunded)} refunded</div>}
                  <div className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#8A8580' }}>
                    {group.payments.length} record{group.payments.length !== 1 ? 's' : ''}
                  </div>
                  <span className="text-[10px]" style={{ color: '#8A8580' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded payment history */}
                {isOpen && (
                  <div style={{ background: '#FAF7F2', borderTop: '1px solid rgba(184,151,58,0.1)' }}>
                    {/* Header */}
                    <div className="grid px-8 py-2 text-[10px] font-medium tracking-wide uppercase"
                      style={{ color: '#8A8580', gridTemplateColumns: '1fr 80px 90px 100px 110px 100px' }}>
                      <span>Date</span>
                      <span>Amount</span>
                      <span>Type</span>
                      <span>Plan</span>
                      <span>Status</span>
                      <span></span>
                    </div>
                    {group.payments
                      .slice()
                      .sort((a, b) => new Date(b.paid_at ?? b.due_date ?? b.created_at).getTime() - new Date(a.paid_at ?? a.due_date ?? a.created_at).getTime())
                      .map((p, pi) => {
                        const ptype = (p as any).payment_type ?? 'tuition'
                        const typeStyle = TYPE_COLORS[ptype] ?? TYPE_COLORS.other
                        return (
                          <div key={p.id}
                            className="grid items-center px-8 py-2.5 text-[12px]"
                            style={{
                              gridTemplateColumns: '1fr 80px 90px 100px 110px 100px',
                              borderTop: pi > 0 ? '1px solid rgba(184,151,58,0.08)' : 'none',
                            }}>
                            <span style={{ color: '#4A4640' }}>
                              {formatDate(p.paid_at ?? p.due_date ?? p.created_at, 'MMM d, yyyy')}
                            </span>
                            <span style={{ color: '#1A1814' }}>{formatCurrency(p.amount_cents)}</span>
                            {/* Payment type — click to cycle */}
                            <button
                              onClick={() => {
                                const types = ['enrollment', 'tuition', 'prorated', 'other']
                                const next = types[(types.indexOf(ptype) + 1) % types.length]
                                updatePayment(p.id, { payment_type: next } as any)
                              }}
                              className="text-left">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: typeStyle.bg, color: typeStyle.color }}>
                                {TYPE_LABELS[ptype]}
                              </span>
                            </button>
                            <span className="text-[11px]" style={{ color: '#8A8580' }}>{(p as any).plan_name ?? '—'}</span>
                            <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                            <div className="flex justify-end gap-1.5">
                              {p.status === 'refunded' && p.refund_amount_cents && (
                                <span className="text-[10px]" style={{ color: '#8A8580' }}>
                                  −{formatCurrency(p.refund_amount_cents)}
                                </span>
                              )}
                              {p.status === 'paid' && (
                                <button
                                  onClick={() => cancelPayment(p.id, p.student_id)}
                                  disabled={cancelling === p.id}
                                  className="text-[10px] px-2 py-0.5 rounded disabled:opacity-50"
                                  style={{ background: '#FDECEA', color: '#791F1F' }}>
                                  {cancelling === p.id ? '…' : 'Cancel'}
                                </button>
                              )}
                              {(p.status === 'pending' || p.status === 'overdue') && (
                                <button onClick={() => updatePayment(p.id, { status: 'paid', paid_at: new Date().toISOString() } as any)}
                                  disabled={updating === p.id}
                                  className="btn btn-gold text-[10px] py-0.5 px-2 disabled:opacity-50">
                                  {updating === p.id ? '…' : '✓ Mark paid'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(184,151,58,0.14)' }}>
            <span className="text-[12px]" style={{ color: '#8A8580' }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, grouped.length)} of {grouped.length} students
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-[12px] disabled:opacity-30"
                style={{ background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.3)' }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-[12px] disabled:opacity-30"
                style={{ background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.3)' }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
