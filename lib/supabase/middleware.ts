import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

  // トークンリフレッシュ（必ず getClaims より前に実行）
  await supabase.auth.getClaims()

  // 年齢確認ゲート
  const { pathname } = request.nextUrl
  const ageCheckDone = request.cookies.get('age_check_done')?.value === '1'
  const isAgeCheckPage = pathname === '/age-check'
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')

  if (!ageCheckDone && !isAgeCheckPage && !isPublicAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/age-check'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
