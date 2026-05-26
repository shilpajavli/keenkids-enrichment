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

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('student_id')
  const date = searchParams.get('date')
  
  let query = supabase
    .from('sign_events')
    .select('*, student:students(id, full_name, parent_id, school:schools(name))')
    .order('timestamp', { ascending: false })
    .limit(100)
  
  if (studentId) query = query.eq('student_id', studentId)
  if (date) {
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`
    query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay)
  }
  
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const body = await req.json()
  const { student_id, event_type } = body
  
  if (!student_id || !event_type) {
    return NextResponse.json({ error: 'student_id and event_type required' }, { status: 400 })
  }
  
  // Insert sign event
  const { data: signEvent, error: insertError } = await admin
    .from('sign_events')
    .insert({
      student_id,
      event_type,
      recorded_by: user?.id,
    })
    .select('*, student:students(id, full_name, parent_id, school:schools(name))')
    .single()
  
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }
  
  // Also update attendance record for today
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  
  if (event_type === 'sign_in') {
    await admin
      .from('attendance')
      .upsert({
        student_id,
        date: today,
        status: 'present',
        sign_in_time: now,
      }, { onConflict: 'student_id,date' })
  } else if (event_type === 'sign_out') {
    await admin
      .from('attendance')
      .update({ sign_out_time: now })
      .eq('student_id', student_id)
      .eq('date', today)
  }
  
  // Send notification to parent
  let notificationError: string | null = null
  
  if (signEvent.student?.parent_id) {
    const { data: parent } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', signEvent.student.parent_id)
      .single()
    
    if (parent?.email) {
      const eventTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      const schoolName = signEvent.student.school?.name || 'school'
      const action = event_type === 'sign_in' ? 'signed in' : 'signed out'
      
      try {
        await transporter.sendMail({
          from: `KeenKids Enrichment <${process.env.GMAIL_USER}>`,
          to: parent.email,
          subject: `${signEvent.student.full_name} ${action} at ${schoolName}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1A1814;">
              <div style="background: #1A1814; padding: 24px 32px; border-bottom: 3px solid #B8973A;">
                <h1 style="color: white; margin: 0; font-weight: 300; font-size: 22px;">
                  <em style="color: #B8973A;">KeenKids</em> Enrichment
                </h1>
              </div>
              <div style="padding: 32px; background: #FAF7F2;">
                <p style="font-size: 18px; margin: 0 0 16px;">
                  ${event_type === 'sign_in' ? '👋' : '🏠'} <strong>${signEvent.student.full_name}</strong> ${action}
                </p>
                <p style="font-size: 15px; color: #4A4640; margin: 0;">
                  <strong>Time:</strong> ${eventTime}<br>
                  <strong>Location:</strong> ${schoolName}
                </p>
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
        
        // Mark notification as sent
        await admin
          .from('sign_events')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', signEvent.id)
          
      } catch (err: any) {
        notificationError = err.message
        await admin
          .from('sign_events')
          .update({ notification_error: err.message })
          .eq('id', signEvent.id)
      }
    }
  }
  
  return NextResponse.json({
    data: signEvent,
    notified: !notificationError,
    notification_error: notificationError,
  }, { status: 201 })
}
