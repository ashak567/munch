import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { clientEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE
  // getUser() refreshes the session if it's expired.
  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') {
    user = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'qa-user@munchpick.com',
      user_metadata: { full_name: 'QA Preview User' },
      created_at: new Date().toISOString(),
      app_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    } as any
  }

  // Protect routes here:
  // - If user is not authenticated and is trying to access protected dashboard routes (under /dashboard or /history or /insights or /profile), redirect to /login
  // - If user is authenticated and trying to access /login or /register or / (the landing page is public, but let's allow it or redirect them to dashboard? Let's redirect to dashboard if they are already logged in to give a premium app feel)
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                          request.nextUrl.pathname.startsWith('/history') || 
                          request.nextUrl.pathname.startsWith('/our-conversations') || 
                          request.nextUrl.pathname.startsWith('/profile')

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/register')

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
