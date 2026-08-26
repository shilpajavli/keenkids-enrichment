import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
})

const ADMIN_EMAIL = 'keenkidsinfo@gmail.com'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('teacher_absences')
    .select('*')
    .order('date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { teacher_name, date, conflict_type, hours_affected, notes } = body
  if (!teacher_name || !date) return NextResponse.json({ error: 'Teacher and date required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('teacher_absences').insert({ teacher_name, date, conflict_type, hours_affected, notes }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admin
  const typeLabel = conflict_type ?? 'Leave'
  const subject = `[KeenKids] ${teacher_name} submitted a ${typeLabel} — ${formatDate(date)}`
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#1A1814">Leave Request Submitted</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#888;width:120px">Teacher</td><td style="padding:6px 0;font-weight:600">${teacher_name}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Date</td><td style="padding:6px 0">${formatDate(date)}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Type</td><td style="padding:6px 0">${typeLabel}</td></tr>
        ${hours_affected ? `<tr><td style="padding:6px 0;color:#888">Hours</td><td style="padding:6px 0">${hours_affected}</td></tr>` : ''}
        ${notes ? `<tr><td style="padding:6px 0;color:#888">Notes</td><td style="padding:6px 0">${notes}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;font-size:13px;color:#888">View all absences in the <a href="https://keenkids-enrichment.vercel.app/dashboard/team">Team page</a>.</p>
    </div>
  `
  transporter.sendMail({ from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`, to: ADMIN_EMAIL, subject, html }).catch(() => {})

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('teacher_absences').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
