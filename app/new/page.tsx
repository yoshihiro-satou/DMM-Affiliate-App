import type { Metadata } from 'next'
import { fetchItemListMixed } from '@/lib/dmm/client'
import { todayJstLabel } from '@/lib/jst-date'
import { ProductCard } from '@/components/product/ProductCard'
import { FavoriteButton } from '@/components/product/FavoriteButton'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'
import type { DmmItem } from '@/types/dmm'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

// 日付はタイトル・h1・description のみに使い、canonical は /new に固定（鮮度シグナル）
export function generateMetadata(): Metadata {
  const date = todayJstLabel()
  const title = `今日のFANZA新作・新着作品（${date}更新）`
  const description = `${date}時点のFANZA新着作品一覧。発売日の新しい順に毎日更新。話題の新作をいち早くチェック。`
  return {
    title,
    description,
    openGraph: { title: `${title} | FANZAピックス`, description, url: '/new' },
    alternates: { canonical: '/new' },
  }
}

export default async function NewPage() {
  // データ取得は try/catch、JSX の構築は外（JSX-in-try の lint 回避）
  let items: DmmItem[] | null = null
  let total = 0
  try {
    const result = await fetchItemListMixed({ sort: 'date', hits: 40, excludeVr: true })
    items = result.items
    total = result.total_count
  } catch {
    items = null
  }

  const header = (
    <div className="border-b border-white/8 px-4 py-4">
      <span
        className="text-[10px] font-semibold tracking-[0.3em] text-emerald-500/80"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        NEW
      </span>
      <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">
        今日のFANZA新作・新着作品
      </h1>
      <p className="mt-0.5 text-[11px] text-white/50">
        {todayJstLabel()}更新 · 発売日の新しい順に掲載
      </p>
    </div>
  )

  if (!items || items.length === 0) {
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
    name: '新作・新着作品',
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
      { '@type': 'ListItem', position: 2, name: '新作・新着作品', item: `${SITE_URL}/new` },
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
        PR · 発売日の新しい順 · {total.toLocaleString('ja-JP')}件以上
      </p>
      <div className="flex flex-col gap-2 px-3 pb-1">
        <PushSubscribeButton />
        <TelegramJoinCard placement="new" />
      </div>
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
    </main>
  )
}
