'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { updateLoginStreak } from '@/lib/login-streak'
import { checkAndAwardBadges } from '@/lib/badge-engine'

export async function signUp(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get('email') as string)?.trim()
  const display_name = (formData.get('display_name') as string)?.trim()
  const password = (formData.get('password') as string) ?? ''
  const confirm = (formData.get('confirm_password') as string) ?? ''

  if (!email || !display_name || !password) {
    return { error: '全ての項目を入力してください' }
  }
  if (password.length < 8) {
    return { error: 'パスワードは8文字以上で入力してください' }
  }
  if (password !== confirm) {
    return { error: 'パスワードが一致しません' }
  }

  // admin API でメール確認済みユーザーを作成（確認メールを送らない）
  const admin = createAdminClient()
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name },
  })

  if (createError) {
    const msg = createError.message.toLowerCase()
    if (
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('duplicate') ||
      msg.includes('unique')
    ) {
      return {
        error:
          'このメールアドレスはすでに登録済みです。ログインページからサインインしてください。',
      }
    }
    return { error: createError.message }
  }

  // profiles テーブルに display_name を保存（トリガーが先に INSERT していても upsert で上書き）
  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      email,
      display_name,
    })
  }

  // そのままパスワードでログイン（セッション確立）
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: signInError.message }
  }

  // ログインストリーク・WELCOMEバッジを付与
  if (data.user) {
    await Promise.all([
      updateLoginStreak(data.user.id),
      checkAndAwardBadges(data.user.id, 'login'),
    ])
  }

  redirect('/')
}
