'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const password = (formData.get('password') as string) ?? ''
  const confirm = (formData.get('confirm_password') as string) ?? ''

  if (password.length < 8) return { error: 'パスワードは8文字以上で入力してください' }
  if (password !== confirm) return { error: 'パスワードが一致しません' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  redirect('/login?updated=1')
}
