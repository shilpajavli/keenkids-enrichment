import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
})

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get('class_id')

  let query = supabase
    .from('students')
    .select('*, student_skills(status), enrollments(class_id)')
    .order('last_name')

  if (classId) {
    query = query.eq('enrollments.class_id', classId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('students')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Email notification to admin
  const name = `${body.first_name ?? ''} ${body.last_name ?? ''}`.trim() || 'A new student'
  transporter.sendMail({
    from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `New enrollment: ${name}`,
    html: `<div style="font-family:Georgia,serif;color:#1A1814;max-width:500px">
      <h2 style="color:#B8973A;font-weight:300">New Student Enrolled</h2>
      <p><strong>${name}</strong> has been added to the program.</p>
      <p style="color:#8A8580;font-size:13px">Log in to link their parent account.</p>
      <a href="https://keenkids.vercel.app/dashboard/students" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#1A1814;color:#B8973A;text-decoration:none;border-radius:8px;font-size:13px">View Students →</a>
    </div>`,
  }).catch(() => {})

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()

  // Check caller's role — parents may only update logistics fields
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
  const role = profile?.role ?? 'parent'

  let allowedBody = body
  if (role === 'parent') {
    const { room_number, teacher_name, needs_escort } = body
    allowedBody = { room_number, teacher_name, needs_escort }
  }

  // Use admin client to bypass RLS for the update
  const admin = createAdminClient()
  const { data, error } = await admin.from('students').update(allowedBody).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  // Unlink any payments referencing this student before deleting
  await admin.from('payments').update({ student_id: null }).eq('student_id', id)

  const { error } = await admin.from('students').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
