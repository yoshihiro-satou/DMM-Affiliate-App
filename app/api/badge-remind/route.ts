import { createAdminClient } from '@/lib/supabase/admin'
import { BADGE_DEFS, type BadgeType } from '@/lib/badges'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * バッジ獲得間近リマインド通知（追加16）。
 * daily-revalidate Worker（JST 0:01）から secret 付きで叩かれる。
 *
 * 連続ログインが あと1日で STREAK バッジに届くユーザー（streak 2/6/29）を抽出し、
 * 「あと1日で◯◯バッジ🔥」を notification_queue へ投入する。実送信は既存の
 * push-notify Worker が担う。日付は login-streak.ts と揃えて UTC 基準で扱う。
 */

// streak の現在値 → あと1日で獲得できるバッジ
const NEXT_BADGE: Record<number, BadgeType> = {
  2: 'STREAK_3',
  6: 'STREAK_7',
  29: 'STREAK_30',
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  // あと1日で STREAK バッジに届き、かつ連続が生きているユーザー。
  // streak 値が 2/6/29 の時点で「まだ達成していない」ことが保証される
  // （達成済みなら 3/7/30 になっている）。last_login >= 昨日 で連続切れを除外。
  // login-streak.ts は UTC 日付で記録するため、JST 当日にログインしたユーザーの
  // last_login_date は yesterday/today の両 UTC 日付に分散する。両方拾うため gte で判定。
  const { data: streaks } = await admin
    .from('login_streaks')
    .select('user_id, current_streak')
    .in('current_streak', [2, 6, 29])
    .gte('last_login_date', yesterday)

  if (!streaks || streaks.length === 0) {
    return Response.json({ notified: 0, reason: 'no users near a streak badge' })
  }

  const candidateIds = streaks.map((s) => s.user_id)

  // プッシュ購読が無いユーザーへ積んでも無駄なので、購読者に絞る（種別は問わない）。
  const { data: subs } = await admin
    .from('notification_subscriptions')
    .select('user_id')
    .in('user_id', candidateIds)
  const subscribed = new Set((subs ?? []).map((s) => s.user_id).filter(Boolean))

  // 今日すでに badge リマインドを積んだユーザーは二重送信しない。
  const todayStartIso = `${today}T00:00:00.000Z`
  const { data: already } = await admin
    .from('notification_queue')
    .select('user_id')
    .eq('type', 'badge')
    .gte('created_at', todayStartIso)
  const alreadyIds = new Set((already ?? []).map((r) => r.user_id).filter(Boolean))

  const rows = streaks
    .filter((s) => subscribed.has(s.user_id) && !alreadyIds.has(s.user_id))
    .map((s) => {
      const badge = BADGE_DEFS[NEXT_BADGE[s.current_streak]]
      return {
        user_id: s.user_id,
        endpoint: null,
        type: 'badge' as const,
        status: 'pending' as const,
        payload: {
          title: `あと1日で「${badge.label}」バッジ${badge.emoji}`,
          body: `今ログインすれば連続記録が途切れず、${badge.description.replace('しました', 'できます')}。`,
          url: '/mypage?ref=push_badge',
          tag: 'badge_remind',
        },
      }
    })

  if (rows.length === 0) {
    return Response.json({ notified: 0, reason: 'all subscribed targets already reminded today' })
  }

  const { error } = await admin.from('notification_queue').insert(rows)
  if (error) {
    return Response.json({ notified: 0, error: error.message }, { status: 500 })
  }

  console.log('[badge-remind] inserted', rows.length, 'notifications')
  return Response.json({ notified: rows.length })
}
