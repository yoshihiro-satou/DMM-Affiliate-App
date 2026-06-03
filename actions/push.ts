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

/**
 * ログインユーザーの現在の通知種別を返す（追加15）。
 * 複数デバイスで購読していても種別は揃える運用のため、最初の1件を代表値とする。
 * 購読が無い場合・未ログインは null。
 */
export async function getMyNotificationType(): Promise<NotificationType | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null
  if (!userId) return null

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('notification_subscriptions')
    .select('notification_type')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return (row?.notification_type as NotificationType | undefined) ?? null
}

/**
 * 購読後に通知種別を変更する（追加15）。
 * 購読時にしか種別を選べず、既存購読が both 既定のままだとセール通知だけ切りたい人が
 * 「通知を全部オフ」にしてしまう離脱を招くため、後から oshi/sale/both を切り替え可能にする。
 *
 * ゲスト（未ログイン）は sale 固定のため対象外。claims をサーバー検証し、本人の
 * 全デバイス分の購読行をまとめて update する。
 */
export async function updateNotificationType(
  notificationType: NotificationType
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub ?? null
  if (!userId) return { ok: false }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_subscriptions')
    .update({ notification_type: notificationType })
    .eq('user_id', userId)

  return { ok: !error }
}
