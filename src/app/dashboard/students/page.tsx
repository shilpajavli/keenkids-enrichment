export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getCurrentProgramId } from '@/lib/program'
import StudentList from '@/components/students/StudentList'
import AutoRefresh from '@/components/ui/AutoRefresh'

export const metadata = { title: 'Students — KeenKids Enrichment' }

export default async function StudentsPage() {
  const supabase = await createServerClient()
  const programId = await getCurrentProgramId()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role, school_id').eq('id', user?.id ?? '').single()
  const isTeacher = profile?.role === 'teacher'
  const teacherSchoolId = isTeacher ? (profile?.school_id ?? null) : null

  // Fetch students with school info
  const { data: allStudentsData } = await supabase
    .from('students')
    .select(`
      *,
      student_skills (status),
      school:schools(*)
    `)
    .eq('program_id', programId ?? '')
    .eq('status', 'active')
    .order('full_name')

  // Resolve the program's school to compare against teacher's assigned school
  const { data: programData } = programId
    ? await supabase.from('programs').select('school:schools(id)').eq('id', programId).single()
    : { data: null }
  const programSchoolId = (programData as any)?.school?.id ?? null

  const students = teacherSchoolId
    ? (programSchoolId === teacherSchoolId ? (allStudentsData ?? []) : [])
    : (allStudentsData ?? [])

  // Fetch inactive (past) students with their last payment info
  const { data: inactiveStudents } = await supabase
    .from('students')
    .select('id, full_name, grade')
    .eq('program_id', programId ?? '')
    .eq('status', 'inactive')
    .order('full_name')

  // Get cancellation info for inactive students
  const inactiveIds = (inactiveStudents ?? []).map(s => s.id)
  const { data: cancelledPayments } = inactiveIds.length
    ? await supabase
        .from('payments')
        .select('student_id, cancellation_notes, cancelled_at, refund_amount_cents, status')
        .in('student_id', inactiveIds)
        .eq('status', 'cancelled')
    : { data: [] }

  const cancelMap: Record<string, { notes: string | null; date: string | null; refund: number | null }> = {}
  for (const p of cancelledPayments ?? []) {
    if (p.student_id) cancelMap[p.student_id] = {
      notes: p.cancellation_notes,
      date: p.cancelled_at,
      refund: p.refund_amount_cents,
    }
  }

  // Fetch schools
  const { data: schools } = await supabase
    .from('schools')
    .select('*')
    .order('name')

  // Fetch parent emails for linked students using admin client (bypasses RLS)
  const admin = createAdminClient()
  const parentIds = [...new Set((students ?? []).map(s => s.parent_id).filter(Boolean))] as string[]
  let parentMap: Record<string, string> = {}
  if (parentIds.length > 0) {
    const { data: parentProfiles } = await admin
      .from('profiles')
      .select('id, email')
      .in('id', parentIds)
    parentProfiles?.forEach((p: { id: string; email: string }) => { parentMap[p.id] = p.email })
  }

  const enriched = (students ?? []).map(s => ({
    ...s,
    skills_total: s.student_skills?.length ?? 0,
    skills_mastered: s.student_skills?.filter((sk: any) => sk.status === 'mastered').length ?? 0,
    parent_email: s.parent_id ? (parentMap[s.parent_id] ?? null) : null,
  }))

  const gradeLabel = (g: number) => g === 0 ? 'K' : `Grade ${g}`

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <div>
        <h1 className="font-serif text-3xl font-light text-ink">Students</h1>
        <p className="text-ink-tertiary text-sm mt-1">{enriched.length} enrolled</p>
      </div>
      <StudentList students={enriched} programId={programId} schools={schools ?? []} isTeacher={isTeacher} />

      {/* Past / Inactive Students */}
      {(inactiveStudents ?? []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(184,151,58,0.14)', background: '#FAF7F2' }}>
            <h2 className="font-medium text-sm" style={{ color: '#1A1814' }}>
              Past Students ({inactiveStudents?.length})
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#8A8580' }}>Cancelled or inactive enrollments</p>
          </div>
          {(inactiveStudents ?? []).map((s, i) => {
            const cancel = cancelMap[s.id]
            return (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: i < (inactiveStudents?.length ?? 0) - 1 ? '1px solid rgba(184,151,58,0.08)' : 'none' }}>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: '#1A1814' }}>{s.full_name}</div>
                  <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: '#8A8580' }}>
                    <span>{gradeLabel(s.grade)}</span>
                    {cancel?.date && <span>· Cancelled {new Date(cancel.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    {cancel?.notes && <span>· {cancel.notes}</span>}
                    {cancel?.refund && <span style={{ color: '#7C3AED' }}>· −${(cancel.refund / 100).toFixed(0)} refunded</span>}
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: '#F5F0E8', color: '#8A8580' }}>Inactive</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
