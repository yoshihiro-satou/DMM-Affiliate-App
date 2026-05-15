import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { sortByRankingScore } from '@/lib/ranking'
import { BentoGrid } from '@/components/layout/BentoGrid'
import { GridCard } from '@/components/product/GridCard'
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton'

export const revalidate = 3600

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

export const metadata: Metadata = {
  title: 'FANZA おすすめ - セール・ランキング',
  description: 'FANZAの人気作品・セール・ランキングをアプリ感覚でチェック。',
}

// ------------------------------------
// 非同期セクション（Suspenseで個別ストリーミング）
// ------------------------------------
async function RankingSection() {
  const result = await fetchItemList({ sort: 'rank', hits: 10, service: 'digital', floor: 'videoa' })
  const ranked = sortByRankingScore(result.items)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '今週のランキング',
    itemListElement: ranked.slice(0, 10).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
      url: item.affiliateURL,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BentoGrid items={ranked} />
    </>
  )
}

async function NewArrivalsSection() {
  const result = await fetchItemList({ sort: 'date', hits: 10, service: 'digital', floor: 'videoa' })
  return (
    <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
      {result.items.map((item, i) => (
        <GridCard key={item.content_id} item={item} featured={BENTO_PATTERN[i % BENTO_PATTERN.length]} />
      ))}
    </div>
  )
}

function LoadingGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} featured={BENTO_PATTERN[i % BENTO_PATTERN.length]} />
      ))}
    </div>
  )
}

// ------------------------------------
// ページ本体
// ------------------------------------
export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* FANZA同人 クーポンバナー（常時固定） */}
      <a
        href="https://al.dmm.co.jp/?lurl=https%3A%2F%2Fwww.dmm.co.jp%2Fdc%2Fdoujin%2F&af_id=fanza-affiliate-001&ch=toolbar&ch_id=tool"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 border-b border-red-900/30 bg-gradient-to-r from-red-950/60 to-black/0 px-4 py-2.5"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold tracking-widest text-red-500/80">
            PR · PICKUP
          </span>
          <span className="text-[13px] font-bold text-white">
            FANZA同人 最大90%OFFクーポン配布中
          </span>
        </div>
        <span className="shrink-0 rounded border border-red-600 px-2 py-1 text-[11px] font-bold text-red-400">
          詳細 →
        </span>
      </a>

      {/* ランキング */}
      <section className="px-3 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-tight text-white">
            今週のランキング
          </h2>
          <a href="/ranking" className="text-[12px] text-white/40 hover:text-white/60">
            もっと見る →
          </a>
        </div>
        <Suspense fallback={<LoadingGrid count={6} />}>
          <RankingSection />
        </Suspense>
      </section>

      {/* 新着作品 */}
      <section className="px-3 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-tight text-white">新着作品</h2>
          <a href="/ranking?period=new" className="text-[12px] text-white/40 hover:text-white/60">
            もっと見る →
          </a>
        </div>
        <Suspense fallback={<LoadingGrid count={4} />}>
          <NewArrivalsSection />
        </Suspense>
      </section>
    </main>
  )
}
