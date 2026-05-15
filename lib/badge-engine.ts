import 'server-only'
import { createAdminClient } from './supabase/admin'
import type { BadgeType } from './badges'

export type BadgeTrigger = 'login' | 'favorite' | 'series_complete' | 'swipe'

export async function checkAndAwardBadges(
  userId: string,
  trigger: BadgeTrigger
): Promise<BadgeType[]> {
  const supabase = createAdminClient()

  const { data: existingRaw } = await supabase
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', userId)

  const existing = (existingRaw ?? []) as Array<{ badge_type: string }>
  const earned = new Set(existing.map((b) => b.badge_type))
  const toAward: BadgeType[] = []

  if (trigger === 'login') {
    if (!earned.has('WELCOME')) toAward.push('WELCOME')

    const { data: streakRaw } = await supabase
      .from('login_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single()
    const streak = streakRaw as { current_streak: number } | null
    const s = streak?.current_streak ?? 0
    if (s >= 3 && !earned.has('STREAK_3')) toAward.push('STREAK_3')
    if (s >= 7 && !earned.has('STREAK_7')) toAward.push('STREAK_7')
    if (s >= 30 && !earned.has('STREAK_30')) toAward.push('STREAK_30')
  }

  if (trigger === 'favorite') {
    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    const n = count ?? 0
    if (n >= 10 && !earned.has('COLLECTOR_10')) toAward.push('COLLECTOR_10')
    if (n >= 50 && !earned.has('COLLECTOR_50')) toAward.push('COLLECTOR_50')
  }

  if (trigger === 'series_complete' && !earned.has('SERIES_COMPLETE')) {
    toAward.push('SERIES_COMPLETE')
  }

  if (trigger === 'swipe') {
    const { count } = await supabase
      .from('swipe_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if ((count ?? 0) >= 10 && !earned.has('REACTOR_10')) toAward.push('REACTOR_10')
  }

  if (toAward.length === 0) return []

  await supabase.from('user_badges').insert(
    toAward.map((badge_type) => ({ user_id: userId, badge_type }))
  )

  // ポイント付与は未公開のため一時停止

  return toAward
}
