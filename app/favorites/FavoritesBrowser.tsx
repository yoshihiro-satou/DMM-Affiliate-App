'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, Tag } from 'lucide-react'
import { RemoveFavoriteButton } from './RemoveFavoriteButton'
import type { EnrichedFavorite } from './types'

type SortKey = 'added' | 'drop' | 'discount' | 'price'
type FilterKey = 'all' | 'drop' | 'sale'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'added', label: '追加順' },
  { key: 'drop', label: '値下げ順' },
  { key: 'discount', label: '割引率順' },
  { key: 'price', label: '価格が安い順' },
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'drop', label: '値下げ中' },
  { key: 'sale', label: 'セール中' },
]

export function FavoritesBrowser({ items }: { items: EnrichedFavorite[] }) {
  const [sort, setSort] = useState<SortKey>('added')
  const [filter, setFilter] = useState<FilterKey>('all')

  const visible = useMemo(() => {
    const filtered = items.filter((it) => {
      if (filter === 'drop') return it.dropSinceSaved > 0
      if (filter === 'sale') return (it.currentDiscount ?? 0) > 0
      return true
    })
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'drop':
          return b.dropSinceSaved - a.dropSinceSaved
        case 'discount':
          return (b.currentDiscount ?? 0) - (a.currentDiscount ?? 0)
        case 'price':
          return (
            (a.currentPrice ?? a.savedPrice ?? Infinity) -
            (b.currentPrice ?? b.savedPrice ?? Infinity)
          )
        default:
          return b.createdAt.localeCompare(a.createdAt)
      }
    })
    return sorted
  }, [items, sort, filter])

  return (
    <div className="p-3">
      {/* 並び替え・絞り込みコントロール */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-[12px] font-bold transition-colors ${
                filter === f.key
                  ? 'border-red-500/50 bg-red-600/15 text-red-300'
                  : 'border-white/12 bg-white/5 text-white/55 hover:border-white/25'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                sort === s.key
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/45 hover:text-white/70'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">
          条件に合うお気に入りがありません
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {visible.map((fav) => (
            <FavoriteCard key={fav.id} fav={fav} />
          ))}
        </div>
      )}
    </div>
  )
}

function FavoriteCard({ fav }: { fav: EnrichedFavorite }) {
  const href = fav.url || '#'
  const dropped = fav.dropSinceSaved > 0
  const dropPct =
    dropped && fav.savedPrice
      ? Math.round((fav.dropSinceSaved / fav.savedPrice) * 100)
      : 0
  const price = fav.currentPrice ?? fav.savedPrice

  return (
    <div className="flex flex-col">
      <a
        href={href}
        target={href !== '#' ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-lg bg-white/5"
      >
        {fav.imageUrl ? (
          <Image
            src={fav.imageUrl}
            alt={fav.title ?? ''}
            width={400}
            height={269}
            className="aspect-[800/538] w-full object-cover"
          />
        ) : (
          <div className="aspect-[800/538] w-full bg-white/5" />
        )}

        {/* 左上バッジ群 */}
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          <span className="rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/70 backdrop-blur-sm">
            PR
          </span>
          {dropped && (
            <span className="flex items-center gap-0.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
              <ArrowDown size={11} strokeWidth={3} />
              値下げ
            </span>
          )}
          {!dropped && (fav.currentDiscount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
              <Tag size={10} strokeWidth={3} />
              {fav.currentDiscount}%OFF
            </span>
          )}
        </div>

        <RemoveFavoriteButton itemId={fav.itemId} />
      </a>

      <div className="mt-1.5 flex flex-col gap-1">
        {fav.title && (
          <p className="line-clamp-2 text-[11px] leading-[1.4] text-white/70">{fav.title}</p>
        )}
        {price !== null && (
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-[13px] font-bold tabular-nums ${dropped ? 'text-red-400' : 'text-white/65'}`}
            >
              ¥{price.toLocaleString('ja-JP')}
            </span>
            {dropped && fav.savedPrice !== null && (
              <>
                <span className="text-[10px] text-white/35 line-through tabular-nums">
                  ¥{fav.savedPrice.toLocaleString('ja-JP')}
                </span>
                <span className="text-[10px] font-bold text-red-400 tabular-nums">
                  -{dropPct}%
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
