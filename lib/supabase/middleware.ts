import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AGE_CHECK_COOKIE, AGE_CHECK_VALUE } from '@/lib/constants/age-check'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ageCheckDone = request.cookies.get(AGE_CHECK_COOKIE)?.value === AGE_CHECK_VALUE
  const isAgeCheckPage = pathname === '/age-check'
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    /^\/google[a-z0-9]+\.html$/.test(pathname)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  // ログイン済みなら年齢確認済みとみなして Cookie を自動付与
  if (!ageCheckDone && claims) {
    supabaseResponse.cookies.set(AGE_CHECK_COOKIE, AGE_CHECK_VALUE, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return supabaseResponse
  }

  if (!ageCheckDone && !isAgeCheckPage && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/age-check'
    url.searchParams.set('from', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
