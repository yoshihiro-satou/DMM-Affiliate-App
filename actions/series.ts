'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAndAwardBadges } from '@/lib/badge-engine'
import { revalidatePath } from 'next/cache'
import type { BadgeType } from '@/lib/badges'

export async function markAsRead(
  itemId: string,
  seriesId: number,
  totalCount?: number
): Promise<{ newBadges: BadgeType[] }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { newBadges: [] }

  await supabase
    .from('series_progress')
    .upsert(
      { user_id: userId, series_id: seriesId, item_id: itemId, status: 'read' },
      { onConflict: 'user_id,item_id' }
    )
  revalidatePath(`/series/${seriesId}`)

  // シリーズ完走チェック
  if (totalCount && totalCount > 0) {
    const { count: readCount } = await supabase
      .from('series_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('series_id', seriesId)

    if ((readCount ?? 0) >= totalCount) {
      const newBadges = await checkAndAwardBadges(userId, 'series_complete')
      return { newBadges }
    }
  }

  return { newBadges: [] }
}

export async function markAsUnread(itemId: string, seriesId: number): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('series_progress')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)
  revalidatePath(`/series/${seriesId}`)
}

export async function followSeries(seriesId: number, seriesName: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('followed_series')
    .upsert(
      { user_id: userId, series_id: seriesId, series_name: seriesName },
      { onConflict: 'user_id,series_id', ignoreDuplicates: true }
    )
  revalidatePath(`/series/${seriesId}`)
  revalidatePath('/series')
}

export async function unfollowSeries(seriesId: number): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('followed_series')
    .delete()
    .eq('user_id', userId)
    .eq('series_id', seriesId)
  revalidatePath(`/series/${seriesId}`)
  revalidatePath('/series')
}
