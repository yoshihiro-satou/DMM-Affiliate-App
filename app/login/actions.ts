'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { GuestFavItem } from '@/lib/guest-favorites'

export async function signIn(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string) ?? ''

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'メールアドレスまたはパスワードが正しくありません' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'メールアドレスが確認されていません。登録メールのリンクをタップしてください' }
    }
    return { error: error.message }
  }

  redirect('/')
}

export async function migrateGuestData(data: {
  favorites: string[]
  favoritesMeta?: GuestFavItem[]
  swipes: Array<{ item_id: string; direction: 'like' | 'skip'; created_at: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub
  if (!userId) return

  await Promise.all([
    data.favorites.length > 0
      ? supabase.from('favorites').upsert(
          data.favorites.map((item_id) => {
            const meta = data.favoritesMeta?.find((m) => m.item_id === item_id)
            return {
              user_id: userId,
              item_id,
              item_title: meta?.title ?? null,
              item_url: meta?.affiliate_url ?? null,
              image_url: meta?.image_url ?? null,
              price: meta?.price ?? null,
            }
          }),
          { onConflict: 'user_id,item_id', ignoreDuplicates: true }
        )
      : Promise.resolve(),
    data.swipes.length > 0
      ? supabase.from('swipe_history').upsert(
          data.swipes.map(({ item_id, direction, created_at }) => ({
            user_id: userId,
            item_id,
            direction,
            created_at,
          })),
          { onConflict: 'user_id,item_id', ignoreDuplicates: true }
        )
      : Promise.resolve(),
  ])
}
