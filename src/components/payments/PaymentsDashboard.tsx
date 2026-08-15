'use client'

import { useState, useEffect } from 'react'
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
}

const STATUS_VARIANT: Record<PaymentStatus, any> = {
  paid:    'green',
  pending: 'amber',
  overdue: 'red',
}

interface ReminderParent {
  parentEmail: string
  parentName: string
  studentName: string
  enrollmentType: string
  stripeLink: string
  totalOwedCents: number
  payments: { amount_cents: number; due_date: string; status: string }[]
}

export default function PaymentsDashboard({ payments: initial, summary: initialSummary, students = [] }: Props) {
  const [payments, setPayments] = useState(initial)
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')
  const [marking, setMarking] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState<string | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [showReminders, setShowReminders] = useState(false)
  const [reminderData, setReminderData] = useState<ReminderParent[]>([])
  const [loadingReminders, setLoadingReminders] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unmatched, setUnmatched] = useState<UnmatchedPayment[]>([])
  const [linking, setLinking] = useState<string | null>(null)
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/payments/unmatched')
      .then(r => r.json())
      .then(j => setUnmatched(j.data ?? []))
  }, [])

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

  async function loadReminders() {
    setLoadingReminders(true)
    setShowReminders(true)
    const res = await fetch('/api/payments/remind')
    const json = await res.json()
    setReminderData(json.data ?? [])
    setLoadingReminders(false)
  }

  function copyEmails() {
    const emails = reminderData.map(r => r.parentEmail).join(', ')
    navigator.clipboard.writeText(emails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildMailtoLink(r: ReminderParent) {
    const firstName = r.parentName.split(' ')[0]
    const subject = `KeenKids Enrichment — Payment Reminder for ${r.studentName}`
    const body = [
      `Hi ${firstName},`,
      ``,
      `This is a friendly reminder that you have an outstanding balance of $${(r.totalOwedCents / 100).toFixed(0)} for ${r.studentName}'s enrichment program.`,
      ``,
      `You can pay securely here:`,
      r.stripeLink,
      ``,
      `Please feel free to reach out if you have any questions.`,
      ``,
      `Thank you!`,
      `KeenKids Enrichment`,
    ].join('\n')
    return `mailto:${r.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const filtered = (statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter))
    .slice()
    .sort((a, b) => (a.student?.full_name ?? '').localeCompare(b.student?.full_name ?? ''))

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

      {/* Payment reminders modal */}
      {showReminders && (
        <div className="card p-5 space-y-4" style={{ border: '1.5px solid rgba(184,151,58,0.35)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-light">Payment reminders</h3>
            <button onClick={() => setShowReminders(false)} className="text-[12px]" style={{ color: '#8A8580' }}>✕ Close</button>
          </div>

          {loadingReminders ? (
            <div className="text-[13px] text-center py-4" style={{ color: '#8A8580' }}>Loading…</div>
          ) : reminderData.length === 0 ? (
            <div className="text-[13px] text-center py-4" style={{ color: '#27500A' }}>🎉 No outstanding payments — everyone is up to date!</div>
          ) : (
            <>
              <p className="text-[12.5px]" style={{ color: '#4A4640' }}>
                {reminderData.length} parent{reminderData.length !== 1 ? 's' : ''} with outstanding balances. Copy their emails and paste into Gmail BCC, or use the individual links below.
              </p>

              {/* Copy all emails */}
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg text-[12px] font-mono truncate"
                  style={{ background: '#F5F0E8', color: '#4A4640' }}>
                  {reminderData.map(r => r.parentEmail).join(', ')}
                </div>
                <button onClick={copyEmails} className="btn btn-gold text-[11px] py-1.5 px-3 whitespace-nowrap">
                  {copied ? '✓ Copied!' : 'Copy all emails'}
                </button>
              </div>

              {/* Per-parent rows */}
              <div className="space-y-2">
                {reminderData.map(r => (
                  <div key={r.parentEmail} className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: '#FAF7F2', border: '1px solid rgba(184,151,58,0.18)' }}>
                    <div>
                      <div className="text-[13px] font-medium">{r.studentName}</div>
                      <div className="text-[11px]" style={{ color: '#8A8580' }}>
                        {r.parentEmail} · <span style={{ color: '#791F1F', fontWeight: 500 }}>${(r.totalOwedCents / 100).toFixed(0)} owed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={buildMailtoLink(r)}
                        className="btn text-[11px] py-1 px-3"
                        style={{ textDecoration: 'none', background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
                        ✉ Email
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Unmatched Stripe payments */}
      {unmatched.length > 0 && (
        <div className="card overflow-hidden" style={{ border: '1.5px solid rgba(251,188,5,0.4)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#FFFBEA', borderBottom: '1px solid rgba(251,188,5,0.2)' }}>
            <div>
              <h3 className="font-medium text-sm" style={{ color: '#1A1814' }}>⚠ Unmatched Stripe Payments ({unmatched.length})</h3>
              <p className="text-xs mt-0.5" style={{ color: '#8A8580' }}>These parents paid but the child name didn't match a student — link them below</p>
            </div>
          </div>
          <div>
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
                    <select
                      value={linkSelections[p.id] ?? ''}
                      onChange={e => setLinkSelections(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none"
                      style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814', minWidth: 160 }}>
                      <option value="">Select student…</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => linkStudent(p.id)}
                      disabled={!linkSelections[p.id] || linking === p.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                      style={{ background: '#1A1814', color: '#B8973A' }}>
                      {linking === p.id ? 'Linking…' : 'Link'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title="Billing roster"
          action={
            <div className="flex items-center gap-3">
              <button
                onClick={loadReminders}
                className="btn text-[11.5px] py-1.5 px-3 flex items-center gap-1.5"
                style={{ background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
                ✉ Send reminders
              </button>
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
