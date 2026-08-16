import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { resolveStudent } from '@/lib/stripe-student-sync'

export async function GET() {
  const admin = createAdminClient()

  // Test with known unmatched students
  const tests = [
    { name: 'Ayush Matturi', school: 'Mabel Mattos Elementary School', amount: 10000 },
    { name: 'Nithilla Renganathan', school: 'John Sinnott Elementary school ( 3rd Grade )', amount: 10000 },
    { name: 'Viyan Raghunathan', school: 'Mabel Mattos Elementary', amount: 10000 },
  ]

  // Also fetch raw data to debug
  const { data: schools, error: schoolsError } = await admin.from('schools').select('id, name')
  const { data: programs, error: programsError } = await admin.from('programs').select('id, school_id, start_date, name').order('start_date', { ascending: false })
  const { data: students } = await admin.from('students').select('id, full_name, status').limit(5)

  // Try a direct insert to see the exact error
  const { data: insertTest, error: insertError } = await admin
    .from('students')
    .insert({
      first_name: 'TEST',
      last_name: 'DELETE_ME',
      grade: 0,
      program_id: '467bceae-eb8d-4e08-b124-57c41a4fbaca',
      status: 'active',
      session_day: 5,
    })
    .select('id')
    .single()

  // Clean up test record if it was created
  if (insertTest?.id) {
    await admin.from('students').delete().eq('id', insertTest.id)
  }

  return NextResponse.json({
    schools,
    programs,
    sampleStudents: students,
    insertTest: insertTest ?? null,
    insertError: insertError ?? null,
  })
}
