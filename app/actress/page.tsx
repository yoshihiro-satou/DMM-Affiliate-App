import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchActressList } from '@/lib/dmm/client'
import { ActressCard } from '@/components/actress/ActressCard'
import { ActressFilters } from './ActressFilters'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '女優一覧',
  description: 'FANZAの人気女優一覧。スリーサイズ・身長で絞り込み検索。',
}

type SearchParams = {
  keyword?: string
  gte_bust?: string
  lte_bust?: string
  gte_height?: string
  lte_height?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

async function ActressResults(params: SearchParams) {
  const result = await fetchActressList({
    hits: 40,
    keyword: params.keyword || undefined,
    gte_bust: params.gte_bust ? parseInt(params.gte_bust) : undefined,
    lte_bust: params.lte_bust ? parseInt(params.lte_bust) : undefined,
    gte_height: params.gte_height ? parseInt(params.gte_height) : undefined,
    lte_height: params.lte_height ? parseInt(params.lte_height) : undefined,
  })

  if (result.actress.length === 0) {
    return (
      <p className="py-16 text-center text-[13px] text-white/30">
        該当する女優が見つかりませんでした
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {result.actress.map((actress) => (
        <ActressCard key={actress.id} actress={actress} />
      ))}
    </div>
  )
}

function ActressGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-white/8" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/8" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/8" />
        </div>
      ))}
    </div>
  )
}

export default async function ActressPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* ヘッダー */}
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          ACTRESS
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">女優一覧</h1>
        <p className="mt-0.5 text-[11px] text-white/30">PR · FANZAアフィリエイトリンク</p>
      </div>

      {/* フィルター */}
      <ActressFilters />

      {/* 一覧 */}
      <div className="px-3 pt-4">
        <Suspense fallback={<ActressGridSkeleton />}>
          <ActressResults {...params} />
        </Suspense>
      </div>
    </main>
  )
}
