import type { Metadata } from 'next'
import type { DmmItem } from '@/types/dmm'
import { fetchSaleItems } from '@/lib/dmm/client'
import { sortByDiscount, getActiveCampaign } from '@/lib/ranking'
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
      <PushSubscribeButton telegramFallback={false} />
      <TelegramJoinCard placement="sale" />
    </div>
  )
  // 高インテント時（スクロール後）に控えめに出すセール速報ナッジ
  const saleNudge = <SaleNotifyNudge />

  // データ取得のみ try/catch に閉じ込め、JSX は外で構築する
  // （JSX-in-try は react-hooks/error-boundaries 違反になるため）
  let items: DmmItem[] = []
  let activeCampaigns: string[] = []
  let failed = false
  try {
    // 動画系フロア（AV・素人）を横断してセール作品を取得（VRは除外）
    const saleItems = await fetchSaleItems({ perFloor: 100, excludeVr: true })
    // 割引率の高い順に並べる
    items = sortByDiscount(saleItems).slice(0, 60)

    // 開催中の DMM 公式キャンペーン名を集計（重複排除・出現頻度順）
    const campaignCounts = new Map<string, number>()
    for (const item of items) {
      const c = getActiveCampaign(item)
      if (c) campaignCounts.set(c.title, (campaignCounts.get(c.title) ?? 0) + 1)
    }
    activeCampaigns = [...campaignCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([title]) => title)
      .slice(0, 3)
  } catch {
    failed = true
  }

  if (failed) {
    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {header}
        <p className="py-16 text-center text-[13px] text-white/55">
          コンテンツを準備中です。しばらくお待ちください。
        </p>
      </main>
    )
  }

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
        PR · 割引率の高い順 · 値引き中{items.length}件
      </p>
      {activeCampaigns.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {activeCampaigns.map((title) => (
            <span
              key={title}
              className="rounded-full border border-red-600/40 bg-red-600/10 px-2 py-0.5 text-[10px] font-bold text-red-400"
            >
              開催中 · {title}
            </span>
          ))}
        </div>
      ) : null}
      {notifyBanner}
      {items.length > 0 ? (
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
      ) : (
        <p className="py-16 text-center text-[13px] text-white/55">
          現在値引き中の作品が見つかりませんでした。時間をおいて再度ご確認ください。
        </p>
      )}
      {saleNudge}
    </main>
  )
}
