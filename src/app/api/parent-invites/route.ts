import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendWelcomeEmail(email: string, studentName: string, isNewUser: boolean) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal`
  const loginLine = isNewUser
    ? `<p style="font-size:14px;color:#4A4640;line-height:1.6;">You'll receive a separate email with a magic link to set up your account. Once logged in, your portal will be ready.</p>`
    : `<p style="font-size:14px;color:#4A4640;line-height:1.6;">You already have an account — <a href="${portalUrl}" style="color:#B8973A;">log in to your portal</a> to get started.</p>`

  await transporter.sendMail({
    from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Welcome to KeenKids Enrichment — ${studentName}'s portal is ready`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1814;">
        <div style="background: #1A1814; padding: 24px 32px; border-bottom: 3px solid #B8973A;">
          <h1 style="color: white; margin: 0; font-weight: 300; font-size: 22px;">
            <em style="color: #B8973A;">KeenKids</em> Enrichment
          </h1>
        </div>
        <div style="padding: 32px; background: #FAF7F2;">
          <p style="font-size: 15px; line-height: 1.7;">Hi there,</p>
          <p style="font-size: 15px; line-height: 1.7;">
            Welcome to KeenKids Enrichment! <strong>${studentName}</strong> has been enrolled in our STEAM after-school program and we're so excited to have your family with us.
          </p>
          ${loginLine}
          <p style="font-size: 14px; font-weight: 600; color: #1A1814; margin: 24px 0 12px 0;">Your parent portal gives you access to:</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📅 <strong>Daily Attendance</strong> — See when your child signs in and out each day</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📖 <strong>Weekly Curriculum</strong> — Stay up to date with what your child is learning</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">💳 <strong>Payments & Billing</strong> — View and pay your tuition online</td></tr>
            <tr><td style="padding:8px 0;font-size:13px;color:#4A4640;">📸 <strong>Photos & Updates</strong> — See highlights from class</td></tr>
          </table>

          <div style="background:#FFF8E7;border:1px solid rgba(184,151,58,0.3);border-radius:8px;padding:20px;margin:24px 0;">
            <p style="font-size:14px;font-weight:600;color:#8A6E25;margin:0 0 8px 0;">📋 Action needed — complete your child's profile</p>
            <p style="font-size:13px;color:#4A4640;line-height:1.6;margin:0 0 12px 0;">
              When you log in, please take a moment to fill in your child's pickup details:
            </p>
            <ul style="font-size:13px;color:#4A4640;line-height:1.8;margin:0 0 12px 0;padding-left:20px;">
              <li><strong>Teacher name</strong> — your child's assigned teacher</li>
              <li><strong>Classroom / room number</strong></li>
              <li><strong>Pickup person</strong> — who will pick up your child each day</li>
              <li><strong>Any pickup notes</strong> — e.g. "my neighbor may pick up on Tuesdays"</li>
            </ul>
            <p style="font-size:13px;color:#4A4640;margin:0;">This helps us ensure a safe and smooth dismissal every day. Thank you!</p>
          </div>

          <hr style="border:none;border-top:1px solid rgba(184,151,58,0.3);margin:24px 0;" />
          <p style="font-size:12px;color:#8A8580;">
            View your child's portal at <a href="${portalUrl}" style="color:#B8973A;">${portalUrl}</a>
          </p>
        </div>
      </div>
    `,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id } = await req.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const admin = createAdminClient()

  // Look up the invite record for this student
  const { data: invite } = await admin
    .from('parent_invites')
    .select('email')
    .eq('student_id', student_id)
    .single()

  if (!invite) return NextResponse.json({ error: 'No invite found for this student' }, { status: 404 })

  // Look up student name for the welcome email
  const { data: student } = await admin.from('students').select('full_name').eq('id', student_id).single()
  const studentName = student?.full_name ?? 'your child'

  // Check if parent already has an account by looking up directly in profiles
  const { data: existingProfile } = await admin.from('profiles').select('id').eq('email', invite.email.toLowerCase()).single()
  let parentUser: { id: string } | null = null
  const isNewUser = !existingProfile
  if (existingProfile) {
    parentUser = { id: existingProfile.id }
  }

  if (!parentUser) {
    // Send magic link invite email from Supabase
    const { data, error } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    parentUser = data.user
  }

  // Upsert profile as parent — never downgrade an existing admin or teacher
  if (!parentUser) return NextResponse.json({ error: 'Failed to resolve parent user' }, { status: 500 })
  const { data: existing } = await admin.from('profiles').select('role').eq('id', parentUser.id).single()
  if (!existing || existing.role === 'parent') {
    await admin.from('profiles').upsert({
      id: parentUser.id,
      email: invite.email,
      full_name: invite.email.split('@')[0],
      role: 'parent',
    }, { onConflict: 'id' })
  }

  // Link student to parent
  await admin.from('students').update({ parent_id: parentUser.id }).eq('id', student_id)

  // Update payment records to include parent_id
  await admin.from('payments').update({ parent_id: parentUser.id }).eq('student_id', student_id)

  // Send custom welcome email (always, for new and existing parents)
  try {
    await sendWelcomeEmail(invite.email, studentName, isNewUser)
  } catch (e) {
    console.error('Welcome email failed:', e)
  }

  return NextResponse.json({ success: true, email: invite.email })
}
