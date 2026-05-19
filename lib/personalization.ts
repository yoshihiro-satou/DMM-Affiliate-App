import 'server-only'
import type { DmmItem } from '@/types/dmm'
import { fetchItemList } from '@/lib/dmm/client'
import { createClient } from '@/lib/supabase/server'

// ── 型定義 ─────────────────────────────────────────────────────────────────────

export type UserProfile = {
  genreScores: Map<number, number>
  actressScores: Map<number, number>
  actressNames: Map<number, string>
  makerScores: Map<number, number>
  seenItemIds: Set<string>
}

// ── 純粋スコアリング関数 ──────────────────────────────────────────────────────

/** 商品とユーザープロフィールの親和性スコア（コサイン類似度の簡易版） */
export function scoreItem(item: DmmItem, profile: UserProfile): number {
  let score = 0
  for (const g of item.iteminfo?.genre ?? []) {
    if (g.id) score += Math.max(0, profile.genreScores.get(g.id) ?? 0)
  }
  for (const a of item.iteminfo?.actress ?? []) {
    if (a.id) score += Math.max(0, profile.actressScores.get(a.id) ?? 0)
  }
  const mid = item.iteminfo?.maker?.[0]?.id
  if (mid) score += Math.max(0, profile.makerScores.get(mid) ?? 0)
  return score
}

/** スコアマップから上位 N 件を取得 */
export function topEntries(
  scores: Map<number, number>,
  n: number
): Array<{ id: number; score: number }> {
  return [...scores.entries()]
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([id, score]) => ({ id, score }))
}

// ── プロフィール構築 ──────────────────────────────────────────────────────────

/**
 * Supabase からスワイプ履歴・お気に入りを取得し
 * ジャンル・女優・メーカーのスコアを集計する。
 * 右スワイプ / お気に入り = +2点、左スワイプ = -1点。
 */
export async function buildUserProfile(userId: string): Promise<UserProfile> {
  const supabase = await createClient()

  const [swipeRes, favRes] = await Promise.all([
    supabase
      .from('swipe_history')
      .select('item_id, direction')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const swipes = swipeRes.data ?? []
  const favs = favRes.data ?? []

  const seenItemIds = new Set([
    ...swipes.map((s) => s.item_id),
    ...favs.map((f) => f.item_id),
  ])

  const genreScores = new Map<number, number>()
  const actressScores = new Map<number, number>()
  const actressNames = new Map<number, string>()
  const makerScores = new Map<number, number>()

  // プロフィール構築用シード（右スワイプ 5件 + お気に入り 5件、最大 8 DMM API calls）
  const likedIds = swipes.filter((s) => s.direction === 'like').slice(0, 5).map((s) => s.item_id)
  const favIds = favs.slice(0, 5).map((f) => f.item_id)
  const seedIds = [...new Set([...likedIds, ...favIds])].slice(0, 8)

  const swipeMap = new Map(swipes.map((s) => [s.item_id, s.direction as 'like' | 'skip']))

  if (seedIds.length > 0) {
    const items = (
      await Promise.all(
        seedIds.map(async (id) => {
          try {
            const r = await fetchItemList({ cid: id, hits: 1 })
            return r.items[0] ?? null
          } catch {
            return null
          }
        })
      )
    ).filter((item): item is DmmItem => item !== null)

    for (const item of items) {
      const direction = swipeMap.get(item.content_id)
      const weight = direction === 'skip' ? -1 : 2

      for (const g of item.iteminfo?.genre ?? []) {
        if (g.id) genreScores.set(g.id, (genreScores.get(g.id) ?? 0) + weight)
      }
      for (const a of item.iteminfo?.actress ?? []) {
        if (a.id) {
          actressScores.set(a.id, (actressScores.get(a.id) ?? 0) + weight)
          if (a.name && !actressNames.has(a.id)) actressNames.set(a.id, a.name)
        }
      }
      const mid = item.iteminfo?.maker?.[0]?.id
      if (mid) makerScores.set(mid, (makerScores.get(mid) ?? 0) + weight)
    }
  }

  return { genreScores, actressScores, actressNames, makerScores, seenItemIds }
}
