import { NextResponse } from 'next/server'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { fetchItemList } from '@/lib/dmm/client'
import { buildUserProfile, scoreItem, topEntries } from '@/lib/personalization'
import type { DmmItem } from '@/types/dmm'

export type RecommendPayload = {
  items: DmmItem[]
  genreItems: DmmItem[]
  actressItems: DmmItem[]
  lastViewed: {
    item_id: string
    item_title: string | null
    affiliate_url: string | null
    image_url: string | null
    viewed_at: string
  } | null
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  // ゲストが LocalStorage の既見 ID をクエリで送信（最大 20件）
  const seenParam = searchParams.get('seen') ?? ''
  const guestSeenIds = seenParam ? seenParam.split(',').filter(Boolean) : []

  const user = await getCurrentUser()

  // ── ゲスト ────────────────────────────────────────────────────────────────
  if (!user) {
    const pool = await fetchItemList({ sort: 'rank', hits: 30, service: 'digital', floor: 'videoa' })
    const guestSeenSet = new Set(guestSeenIds)
    const items = pool.items.filter((item) => !guestSeenSet.has(item.content_id)).slice(0, 20)
    return NextResponse.json({
      items,
      genreItems: [],
      actressItems: [],
      lastViewed: null,
    } satisfies RecommendPayload)
  }

  // ── ログイン済み ──────────────────────────────────────────────────────────
  const supabase = await createClient()

  const [profile, lastViewedRes] = await Promise.all([
    buildUserProfile(user.sub),
    supabase
      .from('view_history')
      .select('item_id, item_title, affiliate_url, image_url, viewed_at')
      .eq('user_id', user.sub)
      .order('viewed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // ゲスト履歴も seen に追加
  for (const id of guestSeenIds) profile.seenItemIds.add(id)

  // 候補プール（人気順 50件）
  const pool = await fetchItemList({ sort: 'rank', hits: 50, service: 'digital', floor: 'videoa' })

  // 既見除外 → スコア降順
  const candidates = pool.items.filter((item) => !profile.seenItemIds.has(item.content_id))
  const scored = candidates
    .map((item) => ({ item, score: scoreItem(item, profile) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)

  // トップジャンル・女優の追加セクション
  const topGenre = topEntries(profile.genreScores, 1)[0]
  const topActress = topEntries(profile.actressScores, 1)[0]

  const [genreResult, actressResult] = await Promise.all([
    topGenre
      ? fetchItemList({
          article: 'genre',
          article_id: topGenre.id,
          sort: 'date',
          hits: 10,
          service: 'digital',
          floor: 'videoa',
        }).catch(() => null)
      : null,
    topActress
      ? fetchItemList({
          article: 'actress',
          article_id: topActress.id,
          sort: 'date',
          hits: 8,
          service: 'digital',
          floor: 'videoa',
        }).catch(() => null)
      : null,
  ])

  const genreItems = (genreResult?.items ?? [])
    .filter((item) => !profile.seenItemIds.has(item.content_id))
    .slice(0, 8)

  const actressItems = (actressResult?.items ?? [])
    .filter((item) => !profile.seenItemIds.has(item.content_id))
    .slice(0, 6)

  return NextResponse.json({
    items: scored.slice(0, 20),
    genreItems,
    actressItems,
    lastViewed: lastViewedRes.data ?? null,
  } satisfies RecommendPayload)
}
