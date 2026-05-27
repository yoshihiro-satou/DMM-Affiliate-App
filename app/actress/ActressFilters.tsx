'use client'

import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs'
import { useTransition } from 'react'
import { Search, X } from 'lucide-react'

const HEIGHT_PRESETS = [
  { label: '〜155', gte: undefined as number | undefined, lte: 155 },
  { label: '155〜160', gte: 155, lte: 160 },
  { label: '160〜165', gte: 160, lte: 165 },
  { label: '165〜', gte: 165, lte: undefined as number | undefined },
]

const BUST_PRESETS = [
  { label: '〜80', gte: undefined as number | undefined, lte: 80 },
  { label: '80〜85', gte: 80, lte: 85 },
  { label: '85〜90', gte: 85, lte: 90 },
  { label: '90〜', gte: 90, lte: undefined as number | undefined },
]

export function ActressFilters() {
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useQueryStates(
    {
      keyword: parseAsString.withDefault(''),
      gte_bust: parseAsInteger,
      lte_bust: parseAsInteger,
      gte_height: parseAsInteger,
      lte_height: parseAsInteger,
    },
    { startTransition, shallow: false }
  )

  const hasFilters =
    !!filters.keyword ||
    filters.gte_bust !== null ||
    filters.lte_bust !== null ||
    filters.gte_height !== null ||
    filters.lte_height !== null

  const clearAll = () =>
    setFilters({ keyword: null, gte_bust: null, lte_bust: null, gte_height: null, lte_height: null })

  return (
    <div
      className={`space-y-3 border-b border-white/8 px-3 py-3 transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      {/* キーワード */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/55" />
        <input
          type="search"
          placeholder="女優名で検索"
          value={filters.keyword}
          onChange={(e) => setFilters({ keyword: e.target.value || null })}
          className="w-full rounded-lg bg-white/8 py-2.5 pl-9 pr-4 text-[13px] text-white outline-none placeholder:text-white/55 focus:bg-white/12 transition-colors"
        />
      </div>

      {/* 身長 */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-white/55">身長 (cm)</p>
        <div className="flex flex-wrap gap-1.5">
          {HEIGHT_PRESETS.map((p) => {
            const active =
              (filters.gte_height ?? null) === (p.gte ?? null) &&
              (filters.lte_height ?? null) === (p.lte ?? null)
            return (
              <button
                key={p.label}
                onClick={() =>
                  setFilters({ gte_height: p.gte ?? null, lte_height: p.lte ?? null })
                }
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  active ? 'bg-red-600 text-white' : 'bg-white/8 text-white/60 hover:bg-white/15'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* バスト */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-white/55">バスト (cm)</p>
        <div className="flex flex-wrap gap-1.5">
          {BUST_PRESETS.map((p) => {
            const active =
              (filters.gte_bust ?? null) === (p.gte ?? null) &&
              (filters.lte_bust ?? null) === (p.lte ?? null)
            return (
              <button
                key={p.label}
                onClick={() => setFilters({ gte_bust: p.gte ?? null, lte_bust: p.lte ?? null })}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  active ? 'bg-red-600 text-white' : 'bg-white/8 text-white/60 hover:bg-white/15'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* リセット */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white/60 transition-colors"
        >
          <X className="size-3" />
          絞り込みをリセット
        </button>
      )}
    </div>
  )
}
