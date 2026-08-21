import { createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: NextRequest) {
  const { data: { user } } = await (await import('@/lib/supabase-server')).createServerClient().then(s => s.auth.getUser())
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, message, emails: specificEmails } = await req.json()
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })

  let emails: string[]
  if (specificEmails?.length) {
    emails = specificEmails
  } else {
    const admin = createAdminClient()
    const { data: profiles } = await admin.from('profiles').select('email').eq('role', 'parent')
    if (!profiles?.length) return NextResponse.json({ error: 'No parents found' }, { status: 400 })
    emails = profiles.map((p: { email: string }) => p.email)
  }

  try {
    await transporter.sendMail({
      from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`,
      to: emails,
      subject,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1814;">
          <div style="background: #1A1814; padding: 24px 32px; border-bottom: 3px solid #B8973A;">
            <h1 style="color: white; margin: 0; font-weight: 300; font-size: 22px;">
              <em style="color: #B8973A;">KeenKids</em> Enrichment
            </h1>
          </div>
          <div style="padding: 32px; background: #FAF7F2;">
            <p style="font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
            <hr style="border: none; border-top: 1px solid rgba(184,151,58,0.3); margin: 24px 0;" />
            <div style="background: #FFF8E7; border: 1px solid rgba(184,151,58,0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 14px; font-weight: 600; color: #8A6E25; margin: 0 0 8px 0;">📋 Action needed — complete your child's profile</p>
              <p style="font-size: 13px; color: #4A4640; line-height: 1.6; margin: 0 0 12px 0;">
                When you log in to the parent portal, please take a moment to fill in your child's pickup details:
              </p>
              <ul style="font-size: 13px; color: #4A4640; line-height: 1.8; margin: 0 0 12px 0; padding-left: 20px;">
                <li><strong>Teacher name</strong> — your child's assigned teacher</li>
                <li><strong>Classroom / room number</strong></li>
                <li><strong>Pickup person</strong> — who will pick up your child each day</li>
                <li><strong>Any pickup notes</strong> — e.g. "my neighbor may pick up on Tuesdays"</li>
              </ul>
              <p style="font-size: 13px; color: #4A4640; margin: 0;">
                This helps us ensure a safe and smooth dismissal every day. Thank you!
              </p>
            </div>
            <p style="font-size: 12px; color: #8A8580;">
              View your child's portal at
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal" style="color: #B8973A;">
                ${process.env.NEXT_PUBLIC_APP_URL}/portal
              </a>
            </p>
          </div>
        </div>
      `,
    })
    return NextResponse.json({ success: true, sent: emails.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
