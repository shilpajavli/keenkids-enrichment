import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week_start')

  const admin = createAdminClient()
  let query = admin
    .from('time_entries')
    .select(`*, teacher:profiles!teacher_id(id, full_name, email), school:schools(id, name)`)
    .eq('status', 'approved')
    .order('date', { ascending: true })

  if (weekStart) {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    query = query.gte('date', weekStart).lte('date', end.toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as any[]

  const csvLines = [
    'Teacher,Email,School,Date,Clock In,Clock Out,Hours,Hourly Rate,Total Pay,Notes',
    ...rows.map(r => {
      const hours = r.hours ?? 0
      const rate = r.hourly_rate ?? 0
      const pay = (hours * rate).toFixed(2)
      const clockIn = r.clock_in ? new Date(r.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
      const clockOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
      return [
        `"${r.teacher?.full_name ?? ''}"`,
        `"${r.teacher?.email ?? ''}"`,
        `"${r.school?.name ?? ''}"`,
        r.date,
        clockIn,
        clockOut,
        hours,
        rate ? `$${rate}` : '',
        rate ? `$${pay}` : '',
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ].join(',')
    })
  ]

  const csv = csvLines.join('\n')
  const filename = weekStart ? `timesheets-${weekStart}.csv` : 'timesheets.csv'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
