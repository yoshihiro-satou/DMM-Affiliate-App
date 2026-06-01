import { getCurrentUser } from '@/lib/supabase/server'
import { updateLoginStreak } from '@/lib/login-streak'
import { checkAndAwardBadges } from '@/lib/badge-engine'

/**
 * 日次チェックイン（追加14）。
 * セッション保持で再訪したログインユーザーは、register/login/auth-confirm を
 * 通らないため login_streaks が更新されず STREAK バッジが伸びなかった。
 * クライアント(Tracker)が1日1回これを叩き、ストリークを進めてバッジを起動する。
 */
export async function POST(): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response(null, { status: 204 })

  await updateLoginStreak(user.sub)
  const newBadges = await checkAndAwardBadges(user.sub, 'login')

  return Response.json({ newBadges })
}
