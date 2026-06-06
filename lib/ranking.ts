import type { DmmItem } from '@/types/dmm'

function newnessFactor(dateStr: string | undefined, now: number): number {
  if (!dateStr) return 1.0
  const daysSince = (now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 30) return 1.5
  if (daysSince <= 90) return 1.2
  return 1.0
}

export function calcRankingScore(item: DmmItem, now = Date.now()): number {
  const avg = item.review?.average ? parseFloat(item.review.average) : 0
  const count = item.review?.count ?? 0
  return avg * Math.log(count + 1) * newnessFactor(item.date, now)
}

export function sortByRankingScore(items: DmmItem[]): DmmItem[] {
  const now = Date.now()
  return [...items].sort((a, b) => calcRankingScore(b, now) - calcRankingScore(a, now))
}

export function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null
  const num = parseInt(priceStr.replace(/,/g, ''), 10)
  return isNaN(num) ? null : num
}

export function calcDiscountRate(
  price: string | undefined,
  listPrice: string | undefined
): number | null {
  const p = parsePrice(price)
  const lp = parsePrice(listPrice)
  if (!p || !lp || lp <= p) return null
  return Math.round((1 - p / lp) * 100)
}

/**
 * DMM のキャンペーン日時（"2026-06-09 23:59:59"）を epoch(ms) に変換する。
 * DMM の日時は JST 基準なので、ランタイムのローカルTZ（CFは UTC）に
 * 引っ張られないよう明示的に +09:00 として解釈する。
 */
export function parseDmmDateTime(s: string | undefined): number {
  if (!s) return NaN
  const t = new Date(s.replace(' ', 'T') + '+09:00').getTime()
  return isNaN(t) ? NaN : t
}

export type DmmCampaign = NonNullable<DmmItem['campaign']>[number]

/**
 * 現在アクティブな DMM 公式キャンペーンを返す（date_begin ≤ now ≤ date_end）。
 * 複数該当する場合は終了が最も早いもの（＝最も急ぐべきもの）を返す。
 */
export function getActiveCampaign(item: DmmItem, now = Date.now()): DmmCampaign | null {
  let active: DmmCampaign | null = null
  let earliestEnd = Infinity
  for (const c of item.campaign ?? []) {
    const begin = parseDmmDateTime(c.date_begin)
    const end = parseDmmDateTime(c.date_end)
    if (isNaN(end)) continue
    const started = isNaN(begin) || begin <= now
    if (started && now <= end && end < earliestEnd) {
      active = c
      earliestEnd = end
    }
  }
  return active
}

/**
 * セール中か判定する。DMM公式キャンペーンがアクティブ、または
 * list_price > price の実値引きがある場合に true。
 */
export function isOnSale(item: DmmItem, now = Date.now()): boolean {
  if (getActiveCampaign(item, now) !== null) return true
  return calcDiscountRate(item.prices.price, item.prices.list_price) !== null
}

/** セール中の作品のみを残す（公式キャンペーン or 実値引き） */
export function filterOnSale(items: DmmItem[], now = Date.now()): DmmItem[] {
  return items.filter((it) => isOnSale(it, now))
}

export type SaleInfo = {
  onSale: boolean
  /** list_price と price から算出した割引率（%）。価格差がなければ null */
  discountRate: number | null
  /** DMM公式キャンペーン名（"ブランドストア30％OFF" 等）。なければ null */
  campaignTitle: string | null
  /** キャンペーン終了日時の生文字列。なければ null */
  endDate: string | null
  /** 終了まであと何日（切り上げ）。キャンペーンがなければ null */
  daysLeft: number | null
}

/** 1作品のセール情報をまとめて返す（バッジ・残り日数表示用） */
export function getSaleInfo(item: DmmItem, now = Date.now()): SaleInfo {
  const campaign = getActiveCampaign(item, now)
  const discountRate = calcDiscountRate(item.prices.price, item.prices.list_price)
  let daysLeft: number | null = null
  if (campaign) {
    const end = parseDmmDateTime(campaign.date_end)
    if (!isNaN(end)) daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000))
  }
  return {
    onSale: campaign !== null || discountRate !== null,
    discountRate,
    campaignTitle: campaign?.title ?? null,
    endDate: campaign?.date_end ?? null,
    daysLeft,
  }
}

export function sortByDiscount(items: DmmItem[]): DmmItem[] {
  return [...items].sort((a, b) => {
    const da = calcDiscountRate(a.prices.price, a.prices.list_price) ?? 0
    const db = calcDiscountRate(b.prices.price, b.prices.list_price) ?? 0
    return db - da
  })
}

/**
 * セール作品の「推し度」スコア。評価の高さ（★平均×レビュー数の対数×新しさ）と
 * 値引き幅の大きさを掛け合わせ、「評価が高い かつ 値引き幅が大きい」作品ほど高くなる。
 * レビューが無い作品は quality=0 のため 0 になり、評価のある作品が優先される。
 */
export function saleAppealScore(item: DmmItem, now = Date.now()): number {
  const discount = calcDiscountRate(item.prices.price, item.prices.list_price) ?? 0
  return calcRankingScore(item, now) * discount
}

/**
 * セール作品を「評価が高い × 値引き幅が大きい」順に並べる。
 * 同スコア（＝レビュー無しで quality=0 同士など）は割引率の高い方を優先する。
 */
export function sortBySaleAppeal(items: DmmItem[], now = Date.now()): DmmItem[] {
  return [...items].sort((a, b) => {
    const diff = saleAppealScore(b, now) - saleAppealScore(a, now)
    if (diff !== 0) return diff
    const da = calcDiscountRate(a.prices.price, a.prices.list_price) ?? 0
    const db = calcDiscountRate(b.prices.price, b.prices.list_price) ?? 0
    return db - da
  })
}
