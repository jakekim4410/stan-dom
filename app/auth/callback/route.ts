import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')           // OAuth provider error
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  // User cancelled OAuth flow or provider returned an error → send home quietly
  if (error || !code) {
    console.log('[Auth Callback] OAuth cancelled or error:', error, errorDescription)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const base = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin)
    return NextResponse.redirect(`${base}/`)
  }

  // Exchange code for session
  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (!exchangeError) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Exchange failed → go home (avoid 404)
  console.error('[Auth Callback] Code exchange failed:', exchangeError)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const base = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin)
  return NextResponse.redirect(`${base}/`)
}

