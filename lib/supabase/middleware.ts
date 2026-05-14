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
    pathname.startsWith('/api/')

  if (!ageCheckDone && !isAgeCheckPage && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/age-check'
    url.searchParams.set('from', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

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

  await supabase.auth.getClaims()

  return supabaseResponse
}
