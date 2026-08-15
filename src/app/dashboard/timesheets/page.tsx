export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TimesheetAdmin from '@/components/timesheets/TimesheetAdmin'
import ClockInOut from '@/components/timesheets/ClockInOut'

export default async function TimesheetsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-light" style={{ color: '#1A1814' }}>
          {isAdmin ? 'Timesheets' : 'My Timesheet'}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8A8580' }}>
          {isAdmin ? 'Review, approve and export teacher hours' : 'Clock in and out for your shift'}
        </p>
      </div>

      {isAdmin ? <TimesheetAdmin /> : <ClockInOut />}
    </div>
  )
}
