import { createClient } from '@/lib/supabase/server'
import { updateLoginStreak } from '@/lib/login-streak'
import { checkAndAwardBadges } from '@/lib/badge-engine'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // パスワードリセットはパスワード更新ページへ（ストリーク更新しない）
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/update-password', request.url))
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await updateLoginStreak(user.id)
        await checkAndAwardBadges(user.id, 'login')
      }

      // next はサイト内パスのみ許容（オープンリダイレクト防止）
      const destination = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
}
