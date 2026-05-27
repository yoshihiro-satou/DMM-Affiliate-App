'use client'

import { useQueryState } from 'nuqs'
import useSWR from 'swr'
import Image from 'next/image'
import { searchQueryParser, searchSortParser } from './searchParsers'
import type { SearchResponse } from '@/lib/search'
import { SearchFavoriteButton } from './SearchFavoriteButton'

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTg0IiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExMTExIi8+PC9zdmc+'

async function fetcher(url: string): Promise<SearchResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('search failed')
  return res.json() as Promise<SearchResponse>
}

type ResultItem = NonNullable<SearchResponse['items'][number]>

function ResultCard({ item }: { item: ResultItem }) {
  return (
    <div className="flex flex-col">
      <a
        href={item.affiliate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-lg bg-white/5"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            width={184}
            height={250}
            unoptimized
            className="aspect-[184/250] w-full object-cover"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            sizes="(max-width: 639px) calc(50vw - 14px), (max-width: 767px) calc(33vw - 14px), 184px"
          />
        ) : (
          <div className="aspect-[184/250] w-full bg-white/5" />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/70 backdrop-blur-sm">
          PR
        </span>
        {item.discount_rate !== null && item.discount_rate >= 5 && (
          <span className="absolute right-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white">
            {item.discount_rate}%OFF
          </span>
        )}
        <SearchFavoriteButton item={item} />
      </a>

      <div className="mt-1.5 flex flex-col gap-1">
        <p className="line-clamp-2 text-[11px] leading-[1.4] text-white/70">{item.title}</p>
        <div className="flex flex-wrap items-center gap-1">
          {item.list_price !== null && item.discount_rate !== null && (
            <span className="text-[10px] text-white/55 line-through">
              ¥{item.list_price.toLocaleString('ja-JP')}
            </span>
          )}
          {item.price !== null && (
            <span
              className={`font-bold tabular-nums ${item.discount_rate ? 'text-[13px] text-red-400' : 'text-[12px] text-white/60'}`}
            >
              ¥{item.price.toLocaleString('ja-JP')}
            </span>
          )}
        </div>
        {item.review_average !== null && item.review_count > 0 && (
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-yellow-400">★</span>
            <span className="text-[10px] text-white/70">{item.review_average.toFixed(1)}</span>
            <span className="text-[9px] text-white/50">({item.review_count})</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-[184/250] w-full animate-pulse rounded-lg bg-white/10" />
      <div className="mt-1.5 space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-white/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  )
}

export function SearchResults() {
  const [q] = useQueryState('q', searchQueryParser)
  const [sort] = useQueryState('sort', searchSortParser)

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (sort) params.set('sort', sort)

  const { data, error, isLoading } = useSWR<SearchResponse>(
    `/api/search?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  )

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-white/65">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm">検索に失敗しました。もう一度お試しください。</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    const isEmpty = !q || q.trim() === ''
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-white/65">
        <span className="text-4xl">{isEmpty ? '🔍' : '😔'}</span>
        <p className="text-sm">
          {isEmpty ? 'キーワードを入力して検索' : `「${q}」の検索結果が見つかりませんでした`}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-3 text-[11px] text-white/55">
        {data.total.toLocaleString('ja-JP')}件見つかりました
        {q && <span>（「{q}」）</span>}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.items.map((item) => (
          <ResultCard key={item.content_id} item={item} />
        ))}
      </div>
    </div>
  )
}
