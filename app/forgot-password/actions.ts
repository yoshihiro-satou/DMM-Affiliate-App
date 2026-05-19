'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function resetPassword(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'メールアドレスを入力してください' }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  const supabase = await createClient()
  // 登録済みかどうかを外部に漏らさないためエラーは無視して常に sent へ
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/confirm`,
  })

  redirect('/forgot-password/sent')
}
