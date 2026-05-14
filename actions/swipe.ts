'use server'

import { createClient } from '@/lib/supabase/server'

export type SwipeDirection = 'like' | 'skip'

export async function recordSwipe(itemId: string, direction: SwipeDirection): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('swipe_history')
    .upsert({ user_id: userId, item_id: itemId, direction }, { onConflict: 'user_id,item_id' })
}
