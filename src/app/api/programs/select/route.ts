import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { program_id } = await req.json()
  const res = NextResponse.json({ success: true })
  res.cookies.set('kk_program', program_id, {
    path: '/',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
