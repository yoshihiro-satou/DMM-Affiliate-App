import 'server-only'
import { createAdminClient } from './supabase/admin'

/**
 * 自前KPI計測（追加12）。GA4 / Search Console はアダルトで規約上使えない・凍結される
 * ケースがあるため、ファネルを自前の events テーブルに記録する。
 *
 * ファネル6段階: visit → age_pass → pwa_install → notify_grant → affiliate_click →（revisit）
 */
export const EVENT_TYPES = [
  'visit',
  'age_pass',
  'pwa_install',
  'notify_grant',
  'affiliate_click',
  'revisit',
  // 追加11: サイト→Telegram「セール速報」チャンネルへの送客クリック（meta.placement で出稿面を識別）
  'telegram_click',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export type RecordEventInput = {
  eventType: EventType
  sessionId?: string | null
  userId?: string | null
  ref?: string | null
  itemId?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * イベントを events テーブルへ記録する（サービスロール = RLSバイパス）。
 * 計測の失敗が本処理を巻き込まないよう、例外は飲み込む（fire-and-forget 用途）。
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('events').insert({
      event_type: input.eventType,
      session_id: input.sessionId ?? null,
      user_id: input.userId ?? null,
      ref: input.ref ?? null,
      item_id: input.itemId ?? null,
      meta: input.meta ?? null,
    })
  } catch (err) {
    console.error('[events] recordEvent failed:', err)
  }
}
