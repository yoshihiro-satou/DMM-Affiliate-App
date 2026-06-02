import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { GuestFavoritesList } from './GuestFavoritesList'
import { ShareFavoritesButton } from './ShareFavoritesButton'
import { FavoritesBrowser } from './FavoritesBrowser'
import { toLargeDmmImageUrl } from '@/lib/dmm/image'
import type { EnrichedFavorite } from './types'

export const metadata: Metadata = {
  title: 'お気に入り',
  description: '保存したお気に入り作品の一覧',
}

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <GuestFavoritesList />
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })

  const items = data ?? []

  // 価格監視（price_history）から現在価格を取得し、保存時比の値下げを算出する
  const itemIds = items.map((i) => i.item_id)
  const priceMap = new Map<
    string,
    { price: number | null; list_price: number | null; discount_rate: number | null }
  >()
  if (itemIds.length > 0) {
    const { data: prices } = await supabase.rpc('get_latest_price_details', {
      item_ids: itemIds,
    })
    for (const p of (prices ?? []) as Array<{
      item_id: string
      price: number | null
      list_price: number | null
      discount_rate: number | null
    }>) {
      priceMap.set(p.item_id, {
        price: p.price,
        list_price: p.list_price,
        discount_rate: p.discount_rate,
      })
    }
  }

  const enriched: EnrichedFavorite[] = items.map((fav) => {
    const latest = priceMap.get(fav.item_id)
    const savedPrice = fav.price ?? null
    const currentPrice = latest?.price ?? null
    // 現在の割引率: price_history の値 → 算出 → 保存時の定価から算出 の順
    const currentDiscount =
      latest?.discount_rate ??
      (latest?.list_price && latest.price && latest.list_price > latest.price
        ? Math.round((1 - latest.price / latest.list_price) * 100)
        : fav.list_price && savedPrice && fav.list_price > savedPrice
          ? Math.round((1 - savedPrice / fav.list_price) * 100)
          : null)
    const dropSinceSaved =
      savedPrice !== null && currentPrice !== null && currentPrice < savedPrice
        ? savedPrice - currentPrice
        : 0
    return {
      id: fav.id,
      itemId: fav.item_id,
      title: fav.item_title ?? null,
      url: fav.item_url ?? '#',
      imageUrl: toLargeDmmImageUrl(fav.image_url),
      savedPrice,
      currentPrice,
      currentDiscount,
      dropSinceSaved,
      createdAt: fav.created_at,
    }
  })

  const dropCount = enriched.filter((e) => e.dropSinceSaved > 0).length

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-white">お気に入り</h1>
            <p className="mt-0.5 text-[11px] text-white/55">
              {items.length}件
              {dropCount > 0 && (
                <span className="ml-2 font-bold text-red-400">値下げ中 {dropCount}件</span>
              )}
            </p>
          </div>
          <ShareFavoritesButton titles={items.map((i) => i.item_title ?? '')} />
        </div>
        <p className="mt-2 text-[13px] text-white/60">
          保存後に値下げされた作品はバッジでお知らせします。
        </p>
      </div>

      {items.length === 0 ? <EmptyState /> : <FavoritesBrowser items={enriched} />}
    </main>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <Heart size={48} className="text-white/10" />
      <div>
        <p className="text-[15px] font-semibold text-white/65">まだお気に入りがありません</p>
        <p className="mt-1 text-[12px] text-white/50">
          作品のハートボタンをタップして保存しましょう
        </p>
      </div>
      <Link
        href="/sale"
        className="mt-2 rounded-xl bg-white/10 px-6 py-2.5 text-[13px] font-semibold text-white/60"
      >
        セール作品を見る
      </Link>
    </div>
  )
}
