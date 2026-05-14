'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { GuestFavItem } from '@/lib/guest-favorites'

export async function signIn(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get('email') as string)?.trim()
  const display_name = (formData.get('display_name') as string)?.trim()

  if (!email || !display_name) {
    return { error: '名前とメールアドレスを入力してください' }
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const emailRedirectTo = `${protocol}://${host}/auth/confirm`

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { display_name },
      emailRedirectTo,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/login/sent')
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
