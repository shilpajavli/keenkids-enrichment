import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
})

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { student_id, parent_email, parent_name, slot = 'parent' } = await req.json()

  const admin = createAdminClient()

  // Find or invite the parent user
  const { data: users } = await admin.auth.admin.listUsers()
  let parentUser = users?.users.find((u: any) => u.email?.toLowerCase() === parent_email?.toLowerCase())
  const isNewUser = !parentUser

  if (!parentUser) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parent_email)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    parentUser = data.user
  }

  // Upsert their profile — never downgrade an existing admin/teacher
  const { data: existing } = await admin.from('profiles').select('role').eq('id', parentUser.id).single()
  if (!existing || existing.role === 'parent') {
    await admin.from('profiles').upsert({
      id: parentUser.id,
      email: parent_email,
      full_name: parent_name || parent_email.split('@')[0],
      role: 'parent',
    }, { onConflict: 'id' })
  }

  // Link to parent_id or parent2_id based on slot
  const field = slot === 'parent2' ? 'parent2_id' : 'parent_id'
  const { error } = await admin
    .from('students')
    .update({ [field]: parentUser.id })
    .eq('id', student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Send welcome email
  const { data: student } = await admin.from('students').select('full_name').eq('id', student_id).single()
  const studentName = student?.full_name ?? 'your child'
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal`
  const loginLine = isNewUser
    ? `<p style="font-size:14px;color:#4A4640;line-height:1.6;">You'll receive a separate email with a magic link to set up your account. Once logged in, your portal will be ready.</p>`
    : `<p style="font-size:14px;color:#4A4640;line-height:1.6;">You already have an account — <a href="${portalUrl}" style="color:#B8973A;">log in to your portal</a> to get started.</p>`
  transporter.sendMail({
    from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`,
    to: parent_email,
    subject: `Welcome to KeenKids Enrichment — ${studentName}'s portal is ready`,
    html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1814;">
      <div style="background:#1A1814;padding:24px 32px;border-bottom:3px solid #B8973A;">
        <h1 style="color:white;margin:0;font-weight:300;font-size:22px;"><em style="color:#B8973A;">KeenKids</em> Enrichment</h1>
      </div>
      <div style="padding:32px;background:#FAF7F2;">
        <p style="font-size:15px;line-height:1.7;">Hi ${parent_name || 'there'},</p>
        <p style="font-size:15px;line-height:1.7;">Welcome to KeenKids Enrichment! <strong>${studentName}</strong> has been enrolled and you've been added as a parent contact.</p>
        ${loginLine}
        <p style="font-size:14px;font-weight:600;color:#1A1814;margin:24px 0 12px 0;">Your parent portal gives you access to:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📅 <strong>Daily Attendance</strong> — See when your child signs in and out</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📖 <strong>Weekly Curriculum</strong> — Stay up to date with what your child is learning</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">💳 <strong>Payments & Billing</strong> — View and pay your tuition online</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📸 <strong>Photos & Updates</strong> — See highlights from class</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid rgba(184,151,58,0.3);margin:24px 0;" />
        <p style="font-size:12px;color:#8A8580;">View your portal at <a href="${portalUrl}" style="color:#B8973A;">${portalUrl}</a></p>
      </div>
    </div>`,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
