import type { Metadata } from 'next'
import { fetchItemList, fetchActressList } from '@/lib/dmm/client'
import type { FetchItemListParams } from '@/lib/dmm/client'
import { sortByRankingScore } from '@/lib/ranking'
import { GridCard } from '@/components/product/GridCard'
import { ActressCard } from '@/components/actress/ActressCard'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { RankingPeriod } from '@/components/ranking/RankingTabs'
import type { DmmActress } from '@/types/dmm'

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ランキング',
  description: 'FANZAの人気作品ランキング。日次・週次・月次・人気女優で絞り込み可能。',
  openGraph: {
    title: 'ランキング | FANZA おすすめ',
    description: 'FANZAの人気作品ランキング。日次・週次・月次・人気女優で絞り込み可能。',
    url: '/ranking',
  },
  alternates: { canonical: '/ranking' },
}

// ------------------------------------
// 作品ランキング設定
// ------------------------------------
type ItemPeriodConfig = {
  fetchParams: Omit<FetchItemListParams, 'hits' | 'service' | 'floor'>
  label: string
  applyScore: boolean
}

const ITEM_PERIOD_CONFIG: Partial<Record<RankingPeriod, ItemPeriodConfig>> = {
  daily:   { fetchParams: { sort: 'rank', offset: 1  }, label: '日次ランキング', applyScore: false },
  weekly:  { fetchParams: { sort: 'rank', offset: 41 }, label: '週次ランキング', applyScore: true  },
  monthly: { fetchParams: { sort: 'review'            }, label: '月次ランキング', applyScore: true  },
}

const PERIOD_LABEL: Record<RankingPeriod, string> = {
  daily:   '日次ランキング',
  weekly:  '週次ランキング',
  monthly: '月次ランキング',
  actress: '人気女優',
}

// ------------------------------------
// 人気女優取得（レビュー上位作品の出演頻度でランク）
// ------------------------------------
async function fetchPopularActresses(limit = 12): Promise<DmmActress[]> {
  const result = await fetchItemList({
    sort: 'review',
    hits: 100,
    service: 'digital',
    floor: 'videoa',
  })

  // 出演頻度カウント
  const countMap = new Map<number, number>()
  for (const item of result.items) {
    for (const act of item.iteminfo?.actress ?? []) {
      if (act.id != null) {
        countMap.set(act.id, (countMap.get(act.id) ?? 0) + 1)
      }
    }
  }

  const topIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  const results = await Promise.all(
    topIds.map((id) =>
      fetchActressList({ actress_id: id, hits: 1 }).then((r) => r.actress[0] ?? null)
    )
  )

  return results.filter((a): a is DmmActress => a !== null)
}

// ------------------------------------
// ページ
// ------------------------------------
type Props = {
  searchParams: Promise<{ period?: string }>
}

export default async function RankingPage({ searchParams }: Props) {
  const { period = 'daily' } = await searchParams
  const validPeriod = (period in PERIOD_LABEL ? period : 'daily') as RankingPeriod
  const label = PERIOD_LABEL[validPeriod]
  const isActress = validPeriod === 'actress'

  if (isActress) {
    const actresses = await fetchPopularActresses().catch(() => [])

    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
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
            PR · レビュー上位作品への出演数順
          </p>
        </div>

        <RankingTabs currentPeriod={validPeriod} />

        <div className="grid grid-cols-2 gap-3 px-3 pb-2 sm:grid-cols-3 md:grid-cols-4">
          {actresses.map((actress) => (
            <ActressCard key={actress.id} actress={actress} />
          ))}
        </div>
      </main>
    )
  }

  // 作品ランキング（daily / weekly / monthly）
  const pageHeader = (
    <>
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          RANKING
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{label}</h1>
      </div>
      <RankingTabs currentPeriod={validPeriod} />
    </>
  )

  try {
    const config = ITEM_PERIOD_CONFIG[validPeriod]!
    const result = await fetchItemList({
      ...config.fetchParams,
      hits: 40,
      service: 'digital',
      floor: 'videoa',
    })
    const items = config.applyScore ? sortByRankingScore(result.items) : result.items

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
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {pageHeader}
        <p className="px-4 pb-2 text-[11px] text-white/30">
          PR · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
        <div className="grid grid-cols-2 grid-flow-dense gap-2 px-3 pb-2 md:grid-cols-4">
          {items.map((item, i) => (
            <GridCard
              key={item.content_id}
              item={item}
              rank={i + 1}
              featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
            />
          ))}
        </div>
      </main>
    )
  } catch {
    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {pageHeader}
        <p className="py-16 text-center text-[13px] text-white/30">
          コンテンツを準備中です。しばらくお待ちください。
        </p>
      </main>
    )
  }
}
