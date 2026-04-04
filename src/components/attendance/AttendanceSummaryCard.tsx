import { createServerClient } from '@/lib/supabase-server'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import StudentAvatar from '@/components/ui/StudentAvatar'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, any> = {
  present: 'green',
  late:    'amber',
  absent:  'red',
}

export default async function AttendanceSummaryCard({ date }: { date: string }) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('attendance')
    .select('*, student:students(id, full_name, avatar_url)')
    .eq('date', date)
    .limit(5)

  return (
    <Card>
      <CardHeader
        title="Today's register"
        action={<span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#EFE6CC', color: '#8A6E25' }}>{date}</span>}
      />
      <CardBody className="p-0">
        {(!data || data.length === 0) && (
          <div className="py-8 text-center text-[13px]" style={{ color: '#8A8580' }}>
            No attendance marked yet
          </div>
        )}
        {data?.map((rec, i) => (
          <div key={rec.id} className="flex items-center gap-3 px-5 py-3"
            style={{ borderBottom: i < data.length - 1 ? '1px solid rgba(184,151,58,0.14)' : 'none' }}>
            <StudentAvatar name={rec.student?.full_name ?? '?'} avatarUrl={rec.student?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{rec.student?.full_name}</div>
            </div>
            <Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge>
          </div>
        ))}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(184,151,58,0.14)' }}>
          <Link href="/dashboard/attendance" className="text-[12px] transition-colors text-[#B8973A] hover:text-[#8A6E25]">
            View full attendance →
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
