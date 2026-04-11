import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, message } = await req.json()
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message required' }, { status: 400 })

  // Get all parent emails
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('email, full_name').eq('role', 'parent')
  if (!profiles?.length) return NextResponse.json({ error: 'No parents found' }, { status: 400 })

  const emails = profiles.map((p: { email: string; full_name: string }) => p.email)

  const { error } = await resend.emails.send({
    from: 'KeenKids Enrichment <onboarding@resend.dev>',
    to: emails,
    subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1814;">
        <div style="background: #B8973A; padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-weight: 300; font-size: 24px;">KeenKids Enrichment</h1>
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, sent: emails.length })
}
