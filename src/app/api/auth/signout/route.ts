// src/app/api/auth/signout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Adicione "await" aqui:
  const supabase = await createClient()
  
  await supabase.auth.signOut()

  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/login', url.origin))
}