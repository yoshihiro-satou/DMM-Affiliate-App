'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

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
  swipes: Array<{ item_id: string; direction: 'like' | 'skip'; created_at: string }>
}) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const userId = authData?.claims?.sub
  if (!userId) return

  if (data.favorites.length > 0) {
    await supabase.from('favorites').upsert(
      data.favorites.map((item_id) => ({ user_id: userId, item_id })),
      { onConflict: 'user_id,item_id', ignoreDuplicates: true }
    )
  }

  if (data.swipes.length > 0) {
    await supabase.from('swipe_history').upsert(
      data.swipes.map(({ item_id, direction, created_at }) => ({
        user_id: userId,
        item_id,
        direction,
        created_at,
      })),
      { onConflict: 'user_id,item_id', ignoreDuplicates: true }
    )
  }
}
