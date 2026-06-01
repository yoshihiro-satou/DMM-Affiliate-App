'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { DmmItem } from '@/types/dmm'
import type { OshiActress } from '@/lib/oshi'

type Props = {
  oshiList: OshiActress[]
  directorName: string
}

/**
 * 推し女優 × 推し監督の作品一覧。複数の推し女優から対象を選択できる。
 */
export function OshiCombinedSelector({ oshiList, directorName }: Props) {
  const [selectedId, setSelectedId] = useState(oshiList[0]?.id ?? '')
  // 取得済みデータは対象女優IDとセットで保持し、loading は派生で求める
  const [loaded, setLoaded] = useState<{ id: string; items: DmmItem[] } | null>(null)

  const selected = oshiList.find((o) => o.id === selectedId) ?? oshiList[0]
  const loading = !loaded || loaded.id !== selected?.id
  const items = loading ? null : loaded.items

  useEffect(() => {
    if (!selected) return
    let alive = true

    const params = new URLSearchParams({
      article: 'actress',
      article_id: selected.id,
      keyword: directorName,
      sort: 'review',
      hits: '12',
      service: 'digital',
      floor: 'videoa',
    })
    fetch(`/api/dmm/items?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: DmmItem[] } | null) => {
        if (alive) setLoaded({ id: selected.id, items: data?.items ?? [] })
      })
      .catch(() => {
        if (alive) setLoaded({ id: selected.id, items: [] })
      })

    return () => {
      alive = false
    }
  }, [selected, directorName])

  if (!selected) return null

  return (
    <div className="rounded-lg border border-rose-900/30 bg-rose-950/20 p-4">
      <p
        className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-rose-400/60"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        推し女優 × 推し監督
      </p>
      <p className="mb-3 text-[11px] text-white/65">
        {selected.name} × {directorName}
      </p>

      {/* 女優セレクター（複数登録時のみ） */}
      {oshiList.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {oshiList.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                o.id === selected.id
                  ? 'border-rose-500/60 bg-rose-600/20 text-rose-300'
                  : 'border-white/12 text-white/55 hover:border-white/25 hover:text-white/75'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

      {/* 作品一覧 */}
      {loading ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-26.75 w-20 shrink-0 animate-pulse rounded-lg bg-white/8" />
          ))}
        </div>
      ) : items && items.length === 0 ? (
        <p className="text-[13px] text-white/55">コラボなし（登録データ上）</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(items ?? []).map((item) => (
            <a
              key={item.content_id}
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              data-item-id={item.content_id}
              className="relative w-20 shrink-0 overflow-hidden rounded-lg bg-white/5"
            >
              {item.imageURL?.list && (
                <Image
                  src={item.imageURL.list}
                  alt={item.title}
                  width={80}
                  height={107}
                  className="aspect-80/107 w-full object-cover"
                />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/65">
                PR
              </span>
              <p className="line-clamp-2 px-1 pb-1 pt-0.5 text-[8px] leading-tight text-white/70">
                {item.title}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
