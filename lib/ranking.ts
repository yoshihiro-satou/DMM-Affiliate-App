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

export function sortByDiscount(items: DmmItem[]): DmmItem[] {
  return [...items].sort((a, b) => {
    const da = calcDiscountRate(a.prices.price, a.prices.list_price) ?? 0
    const db = calcDiscountRate(b.prices.price, b.prices.list_price) ?? 0
    return db - da
  })
}
