import 'server-only'
import { fetchItemList } from '@/lib/dmm/client'
import { calcDiscountRate, parsePrice } from '@/lib/ranking'
import { sceneMap } from './taxonomy'
import type { SceneAxis } from './taxonomy'
import type { Lesson } from './lessons'
import type { DmmItem } from '@/types/dmm'

/** 価格帯に収まるか。価格不明の商品は除外しない（緩い絞り込み）。 */
function inPriceBand(item: DmmItem, band?: { min?: number; max?: number }): boolean {
  if (!band) return true
  const p = parsePrice(item.prices.price)
  if (p === null) return true
  if (band.min !== undefined && p < band.min) return false
  if (band.max !== undefined && p > band.max) return false
  return true
}

/**
 * scene が衝突するか。sceneAxis 未指定/both は常に false（除外しない）。
 * 商品が scene ジャンルを持たない場合も除外しない（情報がないだけ）。
 * 「明示的に別の scene だけが付いている」商品のみ衝突＝除外する。
 */
function sceneConflicts(item: DmmItem, want?: SceneAxis): boolean {
  if (!want || want === 'both') return false
  const scenes = (item.iteminfo?.genre ?? [])
    .map((g) => (g.id !== undefined ? sceneMap[g.id] : undefined))
    .filter((s): s is SceneAxis => s !== undefined)
  if (scenes.length === 0) return false
  return !scenes.some((s) => s === want || s === 'both')
}

function discountOf(item: DmmItem): number {
  return calcDiscountRate(item.prices.price, item.prices.list_price) ?? 0
}

/** 除外ジャンルを1つでも持つか（汚染ジャンルのピンポイント排除用）。 */
function hasExcludedGenre(item: DmmItem, excludeGenreIds?: readonly number[]): boolean {
  if (!excludeGenreIds || excludeGenreIds.length === 0) return false
  const ids = item.iteminfo?.genre ?? []
  return ids.some((g) => g.id !== undefined && excludeGenreIds.includes(g.id))
}

export type LessonPicks = {
  /** 学びにひもづく厳選商品（テーマの評価上位） */
  picks: DmmItem[]
  /** 「今おトク」枠＝同じテーマ内で割引率の高いセール品を最大2点 */
  deals: DmmItem[]
}

/**
 * レッスンの recommendSlots をビルド/ISR時に動的解決する。
 * テーマ候補プールを「genre ＋ 複数キーワード」で集め、その中から
 *   - picks＝評価上位（テーマに合う厳選数点）
 *   - deals＝同じプール内で割引率が高いもの（テーマ無関係の全体最安を出さない）
 * を返す。キーワードが gender-ambiguous（例「吸引」は男性器具も拾う）な問題を、
 * lesson 側でクリーンなブランド/語を keywords 配列に列挙して回避する。
 */
export async function resolveRecommendSlots(lesson: Lesson): Promise<LessonPicks> {
  const r = lesson.recommend
  const hits = r.hits ?? 6

  // クエリ語の決定（keywords 配列を最優先＝テーマに合う商品を確実に引く）
  const terms: Array<string | undefined> =
    r.keywords && r.keywords.length > 0
      ? r.keywords
      : r.keyword
        ? [r.keyword]
        : r.brand
          ? [r.brand]
          : [undefined]

  // 各クエリ語でテーマ候補を取得して統合（dedupe）。評価順で品質を担保。
  const batches = await Promise.all(
    terms.map((term) =>
      fetchItemList({
        service: 'mono',
        floor: 'goods',
        article: r.genreId ? 'genre' : undefined,
        article_id: r.genreId,
        keyword: term,
        sort: 'review',
        hits: 30,
      })
        .then((res) => res.items)
        .catch(() => [] as DmmItem[])
    )
  )

  const pool: DmmItem[] = []
  const seen = new Set<string>()
  for (const items of batches) {
    for (const it of items) {
      if (seen.has(it.content_id)) continue
      if (!inPriceBand(it, r.priceBand)) continue
      if (sceneConflicts(it, r.sceneAxis)) continue
      if (hasExcludedGenre(it, r.excludeGenreIds)) continue
      seen.add(it.content_id)
      pool.push(it)
    }
  }

  // picks＝プール上位（fetch が評価順なので順序を尊重）
  const picks = pool.slice(0, hits)
  const pickIds = new Set(picks.map((p) => p.content_id))

  // deals＝同じテーマプール内で「今セール中かつ割引率が高い」ものを最大2点
  //（picks と重複させない／テーマ無関係の全体最安は出さない）
  const deals = pool
    .filter((it) => !pickIds.has(it.content_id) && discountOf(it) > 0)
    .sort((a, b) => discountOf(b) - discountOf(a))
    .slice(0, 2)

  return { picks, deals }
}
