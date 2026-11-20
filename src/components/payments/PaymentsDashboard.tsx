'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { PaymentRecord } from '@/types'

interface StudentOption {
  id: string
  full_name: string
  enrollment_type?: string
  session_day?: number
  school_id?: string | null
  school_name?: string | null
}

interface SchoolOption { id: string; name: string }

interface Props {
  payments: PaymentRecord[]
  summary: { collected: number; outstanding: number; overdue: number }
  students?: StudentOption[]
  activeStudents?: StudentOption[]
  enrolledCount?: number
  programId?: string
  schools?: SchoolOption[]
}

function programLabel(s: StudentOption): string {
  if (s.enrollment_type === 'steam_lab') return 'STEAM Lab'
  if (s.session_day) return `${s.session_day}-day`
  return '—'
}

const MONTHLY_FEES: Record<string, number> = {
  '1-day':    22000,
  '2-day':    35000,
  '3-day':    45000,
  '4-day':    58000,
  '5-day':    69900,
  'STEAM Lab': 20000,
}

function defaultAmount(s: StudentOption): number {
  return MONTHLY_FEES[programLabel(s)] ?? 69900
}

const PERIODS = [
  'Enrollment Fee',
  'September 2026', 'October 2026', 'November 2026', 'December 2026',
  'January 2027', 'February 2027', 'March 2027', 'April 2027', 'May 2027',
]

function getCurrentPeriod(): string {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export default function PaymentsDashboard({ payments: initial, activeStudents = [], programId, schools = [] }: Props) {
  const [payments, setPayments] = useState(initial)
  const [view, setView] = useState<'roster' | 'history'>('roster')
  const [rosterPeriod, setRosterPeriod] = useState(getCurrentPeriod())
  const [updating, setUpdating] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string>('all')
  // Per-student amount override in roster
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  async function updatePayment(id: string, patch: Record<string, unknown>) {
    setUpdating(id)
    await fetch('/api/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...patch } as PaymentRecord : p))
    setUpdating(null)
  }

  async function markPaid(studentId: string) {
    const student = activeStudents.find(s => s.id === studentId)
    const existing = payments.find(p =>
      p.student?.id === studentId &&
      (p as any).period === rosterPeriod &&
      p.status !== 'cancelled'
    )
    const amountStr = amounts[studentId]
    const amount_cents = amountStr ? Math.round(parseFloat(amountStr) * 100) : (student ? defaultAmount(student) : 69900)
    const paid_at = new Date().toISOString()

    if (existing) {
      await updatePayment(existing.id, { status: 'paid', paid_at, amount_cents })
    } else {
      setUpdating(studentId)
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, period: rosterPeriod, amount_cents, paid_at, program_id: programId }),
      })
      const json = await res.json()
      if (json.data) setPayments(prev => [...prev, json.data])
      setUpdating(null)
    }
  }

  async function markUnpaid(paymentId: string) {
    await updatePayment(paymentId, { status: 'pending', paid_at: null })
  }

  function exportCSV() {
    const rows = [
      ['Student', 'Period', 'Amount', 'Status', 'Date Paid'],
      ...payments
        .filter(p => p.status !== 'cancelled')
        .map(p => [
          p.student?.full_name ?? '',
          (p as any).period ?? '',
          p.amount_cents ? `$${(p.amount_cents / 100).toFixed(2)}` : '',
          p.status,
          p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-US') : '',
        ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Roster
  const rosterPaymentsByStudent = new Map<string, PaymentRecord>()
  for (const p of payments) {
    if ((p as any).period === rosterPeriod && p.student?.id && p.status !== 'cancelled') {
      const ex = rosterPaymentsByStudent.get(p.student.id)
      if (!ex || p.status === 'paid') rosterPaymentsByStudent.set(p.student.id, p)
    }
  }

  const filteredStudents = schoolFilter === 'all'
    ? activeStudents
    : activeStudents.filter(s => s.school_id === schoolFilter)

  const rosterRows = filteredStudents.map(s => ({ student: s, payment: rosterPaymentsByStudent.get(s.id) ?? null }))
  const paidCount = rosterRows.filter(r => r.payment?.status === 'paid').length
  const unpaidCount = rosterRows.length - paidCount

  // Group by program label
  const grouped = new Map<string, typeof rosterRows>()
  for (const row of rosterRows) {
    const key = programLabel(row.student)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }
  const groupOrder = ['1-day', '2-day', '3-day', '4-day', '5-day', 'STEAM Lab', '—']
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const ai = groupOrder.indexOf(a[0]); const bi = groupOrder.indexOf(b[0])
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // History
  const historyPayments = (filterPeriod ? payments.filter(p => (p as any).period === filterPeriod) : payments)
    .filter(p => p.status !== 'cancelled')
    .sort((a, b) => new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime())

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const totalOwed = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#27500A' }}>{formatCurrency(totalPaid)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Total collected</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#633806' }}>{formatCurrency(totalOwed)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Outstanding</div>
        </div>
      </div>

      {/* View toggle + tools */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F5F0E8', border: '1px solid rgba(184,151,58,0.2)' }}>
          {(['roster', 'history'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={view === v ? { background: '#1A1814', color: '#B8973A' } : { color: '#8A6E25' }}>
              {v === 'roster' ? 'Monthly Roster' : 'History'}
            </button>
          ))}
        </div>
        <button onClick={exportCSV} className="btn text-[11.5px] py-1.5 px-3 flex items-center gap-1.5" style={{ background: '#F5F0E8', color: '#8A6E25', border: '1px solid rgba(184,151,58,0.35)' }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* ── ROSTER ── */}
      {view === 'roster' && (
        <Card>
          <CardHeader title="" action={
            <div className="flex items-center gap-2 flex-wrap">
              {schools.length > 1 && (
                <select className="text-[12px] rounded-lg px-2 py-1.5 outline-none"
                  style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814', background: '#FAF7F2' }}
                  value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
                  <option value="all">All schools</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <span className="text-[12px]" style={{ color: '#27500A' }}>✓ {paidCount} paid</span>
              <span className="text-[12px]" style={{ color: '#633806' }}>{unpaidCount} unpaid</span>
              <select className="text-[12px] rounded-lg px-2 py-1.5 outline-none font-medium"
                style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814', background: '#FAF7F2' }}
                value={rosterPeriod} onChange={e => setRosterPeriod(e.target.value)}>
                {PERIODS.filter(p => p !== 'Enrollment Fee').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          } />
          <div className="grid px-5 py-2 text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: '#8A8580', gridTemplateColumns: '1fr 70px 100px 110px 90px', borderBottom: '1px solid rgba(184,151,58,0.14)' }}>
            <span>Student</span><span>Program</span><span>Amount</span><span>Status</span><span></span>
          </div>
          {rosterRows.length === 0 && (
            <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No active students</div>
          )}
          {sortedGroups.map(([groupName, rows]) => (
            <div key={groupName}>
              <div className="px-5 py-1.5 text-[10px] font-semibold tracking-widest uppercase"
                style={{ background: '#FAF7F2', color: '#8A6E25', borderBottom: '1px solid rgba(184,151,58,0.14)', borderTop: '1px solid rgba(184,151,58,0.14)' }}>
                {groupName} · {rows.filter(r => r.payment?.status === 'paid').length}/{rows.length} paid
              </div>
              {rows.map(({ student, payment }, i) => {
                const isPaid = payment?.status === 'paid'
                return (
                  <div key={student.id} className="grid items-center px-5 py-3 text-[13px]"
                    style={{
                      gridTemplateColumns: '1fr 70px 100px 110px 90px',
                      borderBottom: i < rows.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none',
                      background: isPaid ? 'rgba(39,80,10,0.03)' : undefined,
                    }}>
                    <span className="font-medium" style={{ color: '#1A1814' }}>{student.full_name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full w-fit"
                      style={{ background: '#EFE6CC', color: '#8A6E25' }}>
                      {programLabel(student)}
                    </span>
                    <span>
                      {isPaid ? (
                        <span className="text-[12px]" style={{ color: '#27500A' }}>{formatCurrency(payment!.amount_cents)}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder={`$${(defaultAmount(student) / 100).toFixed(0)}`}
                          value={amounts[student.id] ?? ''}
                          onChange={e => setAmounts(a => ({ ...a, [student.id]: e.target.value }))}
                          className="text-[11px] rounded px-2 py-1 w-20 outline-none"
                          style={{ border: '1px solid rgba(184,151,58,0.3)', color: '#1A1814', background: '#FAF7F2' }}
                        />
                      )}
                    </span>
                    <span>
                      {isPaid ? (
                        <span className="text-[12px] font-medium" style={{ color: '#27500A' }}>✓ Paid</span>
                      ) : (
                        <span className="text-[12px]" style={{ color: '#8A8580' }}>Not paid</span>
                      )}
                    </span>
                    <span className="flex justify-end">
                      {isPaid ? (
                        <button onClick={() => markUnpaid(payment!.id)} disabled={updating === payment!.id}
                          className="text-[10px] px-2 py-0.5 rounded disabled:opacity-40"
                          style={{ background: '#FDECEA', color: '#791F1F' }}>
                          {updating === payment!.id ? '…' : 'Undo'}
                        </button>
                      ) : (
                        <button onClick={() => markPaid(student.id)} disabled={updating === student.id || updating === (rosterPaymentsByStudent.get(student.id)?.id ?? '')}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-medium disabled:opacity-40"
                          style={{ background: '#1A1814', color: '#B8973A' }}>
                          {updating === student.id ? '…' : '✓ Mark paid'}
                        </button>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </Card>
      )}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <Card>
          <CardHeader title="Payment history" action={
            <select className="text-[12px] rounded-lg px-2 py-1 outline-none" style={{ border: '1.5px solid rgba(184,151,58,0.3)', color: '#1A1814' }}
              value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="">All periods</option>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          } />
          <div className="grid px-5 py-2 text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: '#8A8580', gridTemplateColumns: '1fr 90px 110px 100px 80px', borderBottom: '1px solid rgba(184,151,58,0.14)' }}>
            <span>Student</span><span>Amount</span><span>Period</span><span>Date paid</span><span></span>
          </div>
          {historyPayments.length === 0 && (
            <div className="py-12 text-center text-[13px]" style={{ color: '#8A8580' }}>No records</div>
          )}
          {historyPayments.map((p, i) => (
            <div key={p.id} className="grid items-center px-5 py-3 text-[12px]"
              style={{ gridTemplateColumns: '1fr 90px 110px 100px 80px', borderBottom: i < historyPayments.length - 1 ? '1px solid rgba(184,151,58,0.1)' : 'none' }}>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: '#1A1814' }}>{p.student?.full_name ?? (p as any).child_name_entered ?? '—'}</span>
                {p.status === 'paid' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#EAF3DE', color: '#27500A' }}>paid</span>}
                {(p.status === 'pending' || p.status === 'overdue') && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>{p.status}</span>}
                {p.status === 'refunded' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#F3E8FF', color: '#7C3AED' }}>refunded</span>}
              </div>
              <span style={{ color: '#1A1814' }}>{formatCurrency(p.amount_cents)}</span>
              <span style={{ color: '#8A8580' }}>{(p as any).period ?? '—'}</span>
              <input
                type="date"
                defaultValue={(p.paid_at ?? '').slice(0, 10)}
                onBlur={e => { if (e.target.value) updatePayment(p.id, { paid_at: new Date(e.target.value).toISOString() }) }}
                className="text-[11px] rounded px-1 py-0.5 outline-none"
                style={{ border: '1px solid rgba(184,151,58,0.3)', color: '#4A4640', background: 'transparent', maxWidth: 120 }}
              />
              <div className="flex justify-end">
                {p.student?.id && (
                  <a href={`/receipt/${p.student.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: '#F5F0E8', color: '#4A4640', border: '1px solid rgba(184,151,58,0.3)', textDecoration: 'none' }}>
                    🖨
                  </a>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
