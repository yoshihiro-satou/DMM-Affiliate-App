import 'server-only'
import { createAdminClient } from './supabase/admin'

export async function updateLoginStreak(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('login_streaks')
    .select('current_streak, last_login_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    await supabase
      .from('login_streaks')
      .insert({ user_id: userId, current_streak: 1, last_login_date: today })
    return
  }

  // 今日すでにログイン済み
  if (existing.last_login_date === today) return

  const newStreak =
    existing.last_login_date === yesterday ? existing.current_streak + 1 : 1

  await supabase
    .from('login_streaks')
    .update({ current_streak: newStreak, last_login_date: today, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}
