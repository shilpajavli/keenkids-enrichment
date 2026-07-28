import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'parent')

  return NextResponse.json({ data, error, keyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY })
}
