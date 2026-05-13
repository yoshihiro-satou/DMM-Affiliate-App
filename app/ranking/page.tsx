import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { sortByRankingScore } from '@/lib/ranking'
import { ProductCard } from '@/components/product/ProductCard'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { RankingPeriod } from '@/components/ranking/RankingTabs'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ランキング',
  description: 'FANZAの人気作品ランキング。日次・週次・月次・新着で絞り込み可能。',
}

const PERIOD_CONFIG: Record<
  RankingPeriod,
  { sort: 'rank' | 'date' | 'review_rank'; label: string }
> = {
  daily: { sort: 'rank', label: '日次ランキング' },
  weekly: { sort: 'rank', label: '週次ランキング' },
  monthly: { sort: 'review_rank', label: '月次ランキング' },
  new: { sort: 'date', label: '新着作品' },
}

type Props = {
  searchParams: Promise<{ period?: string }>
}

export default async function RankingPage({ searchParams }: Props) {
  const { period = 'daily' } = await searchParams
  const validPeriod = (period in PERIOD_CONFIG ? period : 'daily') as RankingPeriod
  const { sort, label } = PERIOD_CONFIG[validPeriod]

  const result = await fetchItemList({
    sort,
    hits: 40,
    service: 'digital',
    floor: 'videoa',
  })

  const items =
    sort === 'rank' || sort === 'review_rank'
      ? sortByRankingScore(result.items)
      : result.items

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: label,
    itemListElement: items.slice(0, 10).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
      url: item.affiliateURL,
    })),
  }

  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヘッダー */}
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          RANKING
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{label}</h1>
        <p className="mt-0.5 text-[11px] text-white/30">
          PR · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
      </div>

      {/* タブ */}
      <RankingTabs currentPeriod={validPeriod} />

      {/* 商品グリッド */}
      <div className="grid grid-cols-2 gap-3 px-3 pb-2 md:grid-cols-4">
        {items.map((item, i) => (
          <ProductCard key={item.content_id} item={item} rank={i + 1} />
        ))}
      </div>
    </main>
  )
}
