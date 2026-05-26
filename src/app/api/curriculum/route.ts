import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('school_id')
  const weekOf = searchParams.get('week_of')
  
  let query = supabase
    .from('curriculum')
    .select('*, school:schools(*)')
    .order('week_of', { ascending: false })
  
  if (schoolId) query = query.eq('school_id', schoolId)
  if (weekOf) query = query.eq('week_of', weekOf)
  
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { data: { user } } = await (await createServerClient()).auth.getUser()
  
  const body = await req.json()
  const { data, error } = await supabase
    .from('curriculum')
    .insert({
      school_id: body.school_id,
      title: body.title,
      description: body.description,
      week_of: body.week_of,
      content: body.content || [],
      created_by: user?.id,
    })
    .select('*, school:schools(*)')
    .single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  const body = await req.json()
  const { data, error } = await supabase
    .from('curriculum')
    .update({
      title: body.title,
      description: body.description,
      content: body.content,
    })
    .eq('id', id)
    .select('*, school:schools(*)')
    .single()
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  const { error } = await supabase
    .from('curriculum')
    .delete()
    .eq('id', id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
