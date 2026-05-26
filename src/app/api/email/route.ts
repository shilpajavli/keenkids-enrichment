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
