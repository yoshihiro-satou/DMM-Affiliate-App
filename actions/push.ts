'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/supabase'

export type NotificationType = 'oshi' | 'sale' | 'both'

/**
 * Web Push 購読を保存する。
 * - ログインユーザー: 選択した種別（oshi / sale / both）で保存
 * - ゲスト（未ログイン）: メール登録なしで「セール速報（sale）」のみ購読可
 *
 * RLS の UPDATE ポリシー（auth.uid() = user_id）はゲスト行（user_id null）を
 * 更新できないため、claims をサーバー側で検証したうえで admin クライアントで
 * upsert する。これにより「ゲスト購読 → 後日ログイン」時の user_id 引き継ぎも成立する。
 */
export async function saveSubscription(subscription: {
  endpoint: string
  keys?: unknown
  notificationType?: NotificationType
}): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null

  // ゲストはセール速報のみ。推し/両方はアカウント必須なので sale に矯正する。
  const notificationType: NotificationType = userId
    ? subscription.notificationType ?? 'both'
    : 'sale'

  const admin = createAdminClient()
  await admin.from('notification_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: (subscription.keys ?? {}) as Json,
      notification_type: notificationType,
    },
    { onConflict: 'endpoint' }
  )
}

/**
 * 購読を解除する。endpoint はデバイス固有かつ推測不能な capability のため、
 * endpoint 一致のみで削除する（ゲスト・ログイン双方に対応）。
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('notification_subscriptions').delete().eq('endpoint', endpoint)
}
