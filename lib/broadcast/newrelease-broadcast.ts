import 'server-only'
import { fetchItemListMixed } from '@/lib/dmm/client'
import {
  type BroadcastAdapter,
  type BroadcastMessage,
  type DeliverOptions,
  type DeliverResult,
  telegramAdapter,
} from '@/lib/broadcast/sale-broadcast'

/**
 * 追加11: 「今日の新作ピックアップ」を Telegram チャンネルへ配信する（全員共通の編集版）。
 *
 * 推し女優の新作は「ユーザーごとに違う」ため Web Push（/api/oshi-notify）で個別配信するのが正解。
 * 一方チャンネルは全員へ同じ1投稿しか送れないので、ここでは人気の新作を編集的に1本へまとめる。
 * 投稿頻度を上げてチャンネルのエンゲージを高めるのが狙い。Telegram のみへ配信し、
 * Web Push へは積まない（毎日のセール速報と重複する通知疲れを避けるため）。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** JST の YYYY-MM-DD（当日・前日）を返す。新作の鮮度判定に使う。 */
function recentJstDates(): Set<string> {
  const nowJst = new Date(Date.now() + JST_OFFSET_MS)
  const today = nowJst.toISOString().slice(0, 10)
  const yesterday = new Date(nowJst.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return new Set([today, yesterday])
}

/**
 * 発売日順で新作を取得し、当日/前日リリースの人気作TOP3で速報メッセージを組み立てる。
 * 鮮度の高い新作が無ければ null（=配信スキップ）。
 */
export async function buildNewReleaseBroadcast(): Promise<BroadcastMessage | null> {
  const result = await fetchItemListMixed({ sort: 'date', hits: 30, excludeVr: true }).catch(
    () => null
  )
  const items = result?.items ?? []
  if (items.length === 0) return null

  const recent = recentJstDates()
  const fresh = items.filter((it) => {
    const d = (it.date ?? '').slice(0, 10)
    return d && recent.has(d)
  })
  // 当日/前日の新作が薄い日は、発売日順の先頭をそのまま新作として扱う（毎日必ず1本出す）
  const picked = (fresh.length >= 3 ? fresh : items).slice(0, 3)
  if (picked.length === 0) return null

  const lead = picked[0].title.slice(0, 24)
  return {
    title: '🆕 本日の新作ピックアップ',
    body: `「${lead}」ほか注目の新作が登場✨ 今日の新着をまとめてチェック`,
    // Web Push へは積まないが、型の都合で push 用 url も持たせておく（未使用）
    url: '/new?ref=push_new',
    telegramUrl: '/new?ref=telegram_new',
    telegramCta: '新作一覧を見る',
    tag: 'new_release_broadcast',
    items: picked.map((item) => ({
      title: item.title,
      discountRate: 0,
      affiliateUrl: item.affiliateURL,
    })),
  }
}

// 新作はチャンネル投稿のみ（Web Push へは積まない）
const NEWRELEASE_ADAPTERS: BroadcastAdapter[] = [telegramAdapter]

/**
 * 新作ピックアップを生成し、Telegram チャンネルへ配信する。
 */
export async function broadcastNewRelease(
  opts: DeliverOptions = {},
  adapters: BroadcastAdapter[] = NEWRELEASE_ADAPTERS
): Promise<{ message: BroadcastMessage | null; results: DeliverResult[] }> {
  const message = await buildNewReleaseBroadcast()
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
