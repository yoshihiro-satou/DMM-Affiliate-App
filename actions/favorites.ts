'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FavoriteItem = {
  item_id: string
  item_title: string
  item_url: string
  image_url: string | null
  price: number | null
}

export async function addFavorite(item: FavoriteItem): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase
    .from('favorites')
    .upsert({ user_id: userId, ...item }, { onConflict: 'user_id,item_id', ignoreDuplicates: true })
  revalidatePath('/favorites')
}

export async function removeFavorite(itemId: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  await supabase.from('favorites').delete().eq('user_id', userId).eq('item_id', itemId)
  revalidatePath('/favorites')
}
