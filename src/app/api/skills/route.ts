import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { id, status } = await req.json()

  const { error } = await supabase
    .from('student_skills')
    .update({ status, ...(status === 'mastered' ? { mastered_at: new Date().toISOString() } : { mastered_at: null }) })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
