import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { sortByDiscount } from '@/lib/ranking'
import { todayJstLabel } from '@/lib/jst-date'
import { ProductCard } from '@/components/product/ProductCard'
import { FavoriteButton } from '@/components/product/FavoriteButton'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { SaleNotifyNudge } from '@/components/sale/SaleNotifyNudge'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

// 日付はタイトル・h1・description のみに使い、canonical は /sale に固定（鮮度シグナル）
export function generateMetadata(): Metadata {
  const date = todayJstLabel()
  const title = `今日のFANZAセール・割引作品（${date}更新）`
  const description = `${date}時点でFANZA値引き中の作品一覧。毎時更新・割引率の高い順に掲載。最大90%OFFのセール作品をチェック。`
  return {
    title,
    description,
    openGraph: { title: `${title} | FANZAピックス`, description, url: '/sale' },
    alternates: { canonical: '/sale' },
  }
}

export default async function SalePage() {
  const header = (
    <div className="border-b border-white/8 px-4 py-4">
      <span
        className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        SALE
      </span>
      <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">
        今日のFANZAセール・割引作品
      </h1>
      <p className="mt-0.5 text-[11px] text-white/50">
        {todayJstLabel()}更新 · 値引き作品を割引率の高い順に掲載
      </p>
    </div>
  )

  // セール速報の通知購読（登録不要で受け取れる）。
  // try/catch の外で構築し、JSX-in-try の lint 違反を増やさない。
  const notifyBanner = (
    <div className="flex flex-col gap-2 px-3 pb-1">
      <PushSubscribeButton />
      <TelegramJoinCard placement="sale" />
    </div>
  )
  // 高インテント時（スクロール後）に控えめに出すセール速報ナッジ
  const saleNudge = <SaleNotifyNudge />

  try {
    const result = await fetchItemList({
      sort: 'rank',
      hits: 40,
      service: 'digital',
      floor: 'videoa',
    })
    const items = sortByDiscount(result.items)

    const jsonLdItemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'セール・値引き作品',
      itemListElement: items.slice(0, 10).map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.title,
        url: item.affiliateURL,
      })),
    }

    const jsonLdBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'セール・値引き作品', item: `${SITE_URL}/sale` },
      ],
    }

    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
        />
        {header}
        <p className="px-4 pb-2 pt-1 text-[11px] text-white/55">
          PR · 割引率の高い順 · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
        {notifyBanner}
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, i) => (
            <ProductCard
              key={item.content_id}
              item={item}
              rank={i + 1}
              overlaySlot={<FavoriteButton item={item} />}
            />
          ))}
        </div>
        {saleNudge}
      </main>
    )
  } catch {
    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {header}
        <p className="py-16 text-center text-[13px] text-white/55">
          コンテンツを準備中です。しばらくお待ちください。
        </p>
      </main>
    )
  }
}
