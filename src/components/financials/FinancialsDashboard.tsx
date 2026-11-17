'use client'

import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface PaymentRow {
  amount_cents: number
  status: string
  payment_type: string | null
  paid_at: string | null
  due_date: string | null
  refund_amount_cents: number | null
}

interface TimeEntryRow {
  hours: number | null
  hourly_rate: number | null
  date: string
  status: string
  teacher: { id: string; full_name: string } | null
}

interface Props {
  payments: PaymentRow[]
  timeEntries: TimeEntryRow[]
}

const MONTHS = 6

const TYPE_LABELS: Record<string, string> = {
  enrollment: 'Enrollment',
  tuition: 'Tuition',
  prorated: 'Prorated',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  enrollment: '#006FFF',
  tuition: '#8A6E25',
  prorated: '#7C3AED',
  other: '#8A8580',
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7) // "2026-08"
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function lastNMonthKeys(n: number) {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export default function FinancialsDashboard({ payments, timeEntries }: Props) {
  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_cents, 0)
  const outstanding = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount_cents, 0)
  const overdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount_cents, 0)
  const refunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + (p.refund_amount_cents ?? p.amount_cents), 0)

  const payrollCents = Math.round(
    timeEntries.reduce((s, t) => s + (t.hours ?? 0) * (t.hourly_rate ?? 0), 0) * 100
  )

  const netCents = collected - payrollCents

  const trend = useMemo(() => {
    const keys = lastNMonthKeys(MONTHS)
    const revenueByMonth = new Map<string, number>()
    const payrollByMonth = new Map<string, number>()

    for (const p of payments) {
      if (p.status !== 'paid' || !p.paid_at) continue
      const key = monthKey(p.paid_at)
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amount_cents)
    }
    for (const t of timeEntries) {
      const key = monthKey(t.date)
      const cents = Math.round((t.hours ?? 0) * (t.hourly_rate ?? 0) * 100)
      payrollByMonth.set(key, (payrollByMonth.get(key) ?? 0) + cents)
    }

    return keys.map(key => {
      const revenue = revenueByMonth.get(key) ?? 0
      const payroll = payrollByMonth.get(key) ?? 0
      return {
        month: monthLabel(key),
        Revenue: Math.round(revenue / 100),
        Payroll: Math.round(payroll / 100),
        Net: Math.round((revenue - payroll) / 100),
      }
    })
  }, [payments, timeEntries])

  const byType = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      if (p.status !== 'paid') continue
      const type = p.payment_type ?? 'other'
      map.set(type, (map.get(type) ?? 0) + p.amount_cents)
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    return Array.from(map.entries())
      .map(([type, amount]) => ({ type, amount, pct: total ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [payments])

  const byTeacher = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; pay: number }>()
    for (const t of timeEntries) {
      if (!t.teacher) continue
      const key = t.teacher.id
      if (!map.has(key)) map.set(key, { name: t.teacher.full_name, hours: 0, pay: 0 })
      const entry = map.get(key)!
      entry.hours += t.hours ?? 0
      entry.pay += Math.round((t.hours ?? 0) * (t.hourly_rate ?? 0) * 100)
    }
    return Array.from(map.values()).sort((a, b) => b.pay - a.pay)
  }, [timeEntries])

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#27500A' }}>{formatCurrency(collected)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Revenue collected</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#791F1F' }}>{formatCurrency(payrollCents)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Payroll (approved)</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: netCents >= 0 ? '#27500A' : '#791F1F' }}>
            {formatCurrency(netCents)}
          </div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Net income</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#633806' }}>{formatCurrency(outstanding + overdue)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Outstanding + overdue</div>
        </div>
        <div className="card p-5">
          <div className="font-serif text-2xl font-light mb-1" style={{ color: '#7C3AED' }}>{formatCurrency(refunded)}</div>
          <div className="text-[12px]" style={{ color: '#8A8580' }}>Refunded</div>
        </div>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader title="Revenue vs. payroll — last 6 months" />
        <CardBody>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,151,58,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={{ stroke: 'rgba(184,151,58,0.25)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(184,151,58,0.3)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="#27500A" radius={[4, 4, 0, 0]} barSize={22} />
                <Bar dataKey="Payroll" fill="#791F1F" radius={[4, 4, 0, 0]} barSize={22} />
                <Line type="monotone" dataKey="Net" stroke="#B8973A" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Revenue by type */}
        <Card>
          <CardHeader title="Revenue by type" />
          <CardBody className="space-y-3">
            {byType.length === 0 && <div className="text-[13px]" style={{ color: '#8A8580' }}>No paid revenue yet</div>}
            {byType.map(({ type, amount, pct }) => (
              <div key={type}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-medium" style={{ color: '#1A1814' }}>{TYPE_LABELS[type] ?? type}</span>
                  <span style={{ color: '#8A8580' }}>{formatCurrency(amount)} · {pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: '#F5F0E8' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TYPE_COLORS[type] ?? '#8A8580' }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Payroll by teacher */}
        <Card>
          <CardHeader title="Payroll by teacher" />
          <CardBody className="p-0">
            {byTeacher.length === 0 && <div className="p-5 text-[13px]" style={{ color: '#8A8580' }}>No approved hours yet</div>}
            {byTeacher.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between px-5 py-2.5 text-[12.5px]"
                style={{ borderTop: i > 0 ? '1px solid rgba(184,151,58,0.1)' : 'none' }}>
                <span style={{ color: '#1A1814' }}>{t.name}</span>
                <span style={{ color: '#8A8580' }}>{t.hours.toFixed(1)}h · <span style={{ color: '#791F1F' }}>{formatCurrency(t.pay)}</span></span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
