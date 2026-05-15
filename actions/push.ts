'use server'

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

export async function saveSubscription(subscription: {
  endpoint: string
  keys?: unknown
}): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase.from('notification_subscriptions').upsert(
    { user_id: userId, endpoint: subscription.endpoint, keys: (subscription.keys ?? {}) as Json },
    { onConflict: 'endpoint' }
  )
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('notification_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
}
