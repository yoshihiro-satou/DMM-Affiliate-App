'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from '@/lib/badge-engine'
import type { BadgeType } from '@/lib/badges'

export type SwipeDirection = 'like' | 'skip'

export async function recordSwipe(
  itemId: string,
  direction: SwipeDirection
): Promise<{ newBadges: BadgeType[] }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { newBadges: [] }

  await supabase
    .from('swipe_history')
    .upsert({ user_id: userId, item_id: itemId, direction }, { onConflict: 'user_id,item_id' })

  const newBadges = await checkAndAwardBadges(userId, 'swipe')
  return { newBadges }
}
