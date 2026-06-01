import 'server-only'
import { createAdminClient } from './supabase/admin'
import { BADGE_DEFS, ALL_BADGE_TYPES, type BadgeType } from './badges'

export type BadgeProgress = {
  type: BadgeType
  earned: boolean
  current: number
  target: number
}

/** バッジごとの達成しきい値（バイナリ系は 1）。 */
const BADGE_TARGET: Record<BadgeType, number> = {
  WELCOME: 1,
  STREAK_3: 3,
  STREAK_7: 7,
  STREAK_30: 30,
  COLLECTOR_10: 10,
  COLLECTOR_50: 50,
  SERIES_COMPLETE: 1,
  REACTOR_10: 10,
}

/**
 * ユーザーのバッジ獲得状況と「次のバッジまであと◯」を算出する（追加14）。
 * お気に入り数・スワイプ数・連続ログイン日数を1リクエストで集計。
 */
export async function getBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  const supabase = createAdminClient()

  const [earnedRes, favRes, swipeRes, streakRes] = await Promise.all([
    supabase.from('user_badges').select('badge_type').eq('user_id', userId),
    supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('swipe_history').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('login_streaks').select('current_streak').eq('user_id', userId).maybeSingle(),
  ])

  const earned = new Set(
    ((earnedRes.data ?? []) as Array<{ badge_type: string }>).map((b) => b.badge_type)
  )
  const favCount = favRes.count ?? 0
  const swipeCount = swipeRes.count ?? 0
  const streak = (streakRes.data as { current_streak: number } | null)?.current_streak ?? 0

  function currentFor(type: BadgeType): number {
    switch (type) {
      case 'STREAK_3':
      case 'STREAK_7':
      case 'STREAK_30':
        return streak
      case 'COLLECTOR_10':
      case 'COLLECTOR_50':
        return favCount
      case 'REACTOR_10':
        return swipeCount
      default:
        // バイナリ（WELCOME / SERIES_COMPLETE）は獲得済みなら1
        return earned.has(type) ? 1 : 0
    }
  }

  return ALL_BADGE_TYPES.map((type) => {
    const target = BADGE_TARGET[type]
    const isEarned = earned.has(type)
    return {
      type,
      earned: isEarned,
      current: Math.min(currentFor(type), target),
      target,
    }
  }).sort((a, b) => {
    // 未獲得かつ達成間近を上位に、獲得済みは後ろにまとめる
    if (a.earned !== b.earned) return a.earned ? 1 : -1
    const ra = a.target - a.current
    const rb = b.target - b.current
    return ra - rb
  })
}

export { BADGE_DEFS }
