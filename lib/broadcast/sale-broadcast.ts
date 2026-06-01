import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDailyDeals } from '@/lib/dmm/daily-deals'
import type { DmmItem } from '@/types/dmm'

/**
 * 追加13: セール速報を「1つのコンテンツ資産」として生成し、複数チャネルへ
 * ファンアウト配信する分散配信アーキテクチャ。
 *
 * 生成ロジックは1本（buildSaleBroadcast）。配信先はアダプタを足すだけで増やせる。
 * Phase 1 では Web Push アダプタを実装。Telegram / メールは Phase 2（友好チャネル）。
 */

export type BroadcastMessage = {
  title: string
  body: string
  url: string
  tag: string
  /** TOP作品（ログ・将来のリッチ通知用） */
  items: Array<{ title: string; discountRate: number; affiliateUrl: string }>
}

export type DeliverResult = {
  channel: string
  delivered: number
  skipped: number
  reason?: string
}

export type DeliverOptions = {
  /** true なら配信せず対象者数のみ算出（本番での安全な検証用） */
  dryRun?: boolean
}

export interface BroadcastAdapter {
  name: string
  deliver(message: BroadcastMessage, opts?: DeliverOptions): Promise<DeliverResult>
}

// ── 生成（単一の真実のソース） ────────────────────────────────────────────────

function discountRate(item: DmmItem): number {
  const price = Number(item.prices?.price)
  const list = Number(item.prices?.list_price)
  if (!price || !list || list <= price) return 0
  return Math.round((1 - price / list) * 100)
}

/** 日替わりセールから割引率TOPを抽出して速報メッセージを組み立てる。 */
export async function buildSaleBroadcast(): Promise<BroadcastMessage | null> {
  const deals = await fetchDailyDeals(50).catch(() => [])
  if (deals.length === 0) return null

  const ranked = deals
    .map((item) => ({ item, rate: discountRate(item) }))
    .filter((x) => x.rate > 0)
    .sort((a, b) => b.rate - a.rate)

  if (ranked.length === 0) return null

  const top = ranked.slice(0, 3)
  const maxOff = top[0].rate
  const lead = top[0].item.title.slice(0, 24)

  return {
    title: '🔥 本日のFANZAセール速報',
    // 熱量のある文体（施策9・Bの指摘）
    body: `【${maxOff}%OFF】「${lead}」ほか本日限りの特価が登場🎉 最大${maxOff}%OFFを今すぐチェック`,
    url: '/sale',
    tag: 'sale_broadcast',
    items: top.map(({ item, rate }) => ({
      title: item.title,
      discountRate: rate,
      affiliateUrl: item.affiliateURL,
    })),
  }
}

// ── JST 当日判定ヘルパー ───────────────────────────────────────────────────────

function jstDayStartUtcIso(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dayStartJst = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())
  return new Date(dayStartJst - 9 * 60 * 60 * 1000).toISOString()
}

// ── Web Push アダプタ（Phase 1） ──────────────────────────────────────────────

/**
 * セール速報通知を希望（type in 'sale','both'）するユーザーの notification_queue に積む。
 * 実際の送信は既存の push-notify Worker（15分ごと cron）が担う。
 * 同日に同一ユーザーへ二重投入しないようガードする。
 */
export const webPushAdapter: BroadcastAdapter = {
  name: 'web_push',
  async deliver(message, opts): Promise<DeliverResult> {
    const admin = createAdminClient()

    const { data: subs } = await admin
      .from('notification_subscriptions')
      .select('user_id, notification_type')
      .in('notification_type', ['sale', 'both'])

    const userIds = [...new Set((subs ?? []).map((s) => s.user_id))]
    if (userIds.length === 0) {
      return { channel: 'web_push', delivered: 0, skipped: 0, reason: 'no sale subscribers' }
    }

    // 本日すでにセール速報を積んだユーザーを除外
    const { data: already } = await admin
      .from('notification_queue')
      .select('user_id')
      .eq('type', 'sale_broadcast')
      .gte('created_at', jstDayStartUtcIso())
    const alreadyIds = new Set((already ?? []).map((r) => r.user_id))

    const targets = userIds.filter((id) => !alreadyIds.has(id))
    if (targets.length === 0) {
      return { channel: 'web_push', delivered: 0, skipped: userIds.length, reason: 'all sent today' }
    }

    // dry-run: 実投入せず対象者数のみ返す
    if (opts?.dryRun) {
      return {
        channel: 'web_push',
        delivered: 0,
        skipped: userIds.length - targets.length,
        reason: `dry-run: would queue ${targets.length}`,
      }
    }

    const rows = targets.map((user_id) => ({
      user_id,
      type: 'sale_broadcast',
      status: 'pending',
      payload: {
        title: message.title,
        body: message.body,
        url: message.url,
        tag: message.tag,
      },
    }))

    const { error } = await admin.from('notification_queue').insert(rows)
    if (error) {
      return { channel: 'web_push', delivered: 0, skipped: userIds.length, reason: error.message }
    }

    return { channel: 'web_push', delivered: targets.length, skipped: userIds.length - targets.length }
  },
}

// ── Telegram / メール アダプタ（Phase 2 で実装） ──────────────────────────────

export const telegramAdapter: BroadcastAdapter = {
  name: 'telegram',
  async deliver(): Promise<DeliverResult> {
    // TODO(Phase 2): Telegram Bot API で「セール速報チャンネル」へ送信
    return { channel: 'telegram', delivered: 0, skipped: 0, reason: 'not configured (Phase 2)' }
  },
}

export const emailAdapter: BroadcastAdapter = {
  name: 'email',
  async deliver(): Promise<DeliverResult> {
    // TODO(Phase 2): メールマガジン配信（自社リスト）
    return { channel: 'email', delivered: 0, skipped: 0, reason: 'not configured (Phase 2)' }
  },
}

// ── ファンアウト実行 ───────────────────────────────────────────────────────────

const DEFAULT_ADAPTERS: BroadcastAdapter[] = [webPushAdapter, telegramAdapter, emailAdapter]

/**
 * セール速報を生成し、有効な全チャネルへ同時配信する。
 * どこかのチャネルが失敗しても他は継続（分散配信）。
 */
export async function broadcastSale(
  opts: DeliverOptions = {},
  adapters: BroadcastAdapter[] = DEFAULT_ADAPTERS
): Promise<{ message: BroadcastMessage | null; results: DeliverResult[] }> {
  const message = await buildSaleBroadcast()
  if (!message) return { message: null, results: [] }

  const results = await Promise.all(
    adapters.map((a) =>
      a.deliver(message, opts).catch(
        (err): DeliverResult => ({
          channel: a.name,
          delivered: 0,
          skipped: 0,
          reason: err instanceof Error ? err.message : 'error',
        })
      )
    )
  )

  return { message, results }
}
