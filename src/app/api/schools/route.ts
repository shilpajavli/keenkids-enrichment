import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name')
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  
  const { data, error } = await supabase
    .from('schools')
    .insert({ name: body.name, location: body.location })
    .select()
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
    .from('schools')
    .update(body)
    .eq('id', id)
    .select()
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
    .from('schools')
    .delete()
    .eq('id', id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
