'use client'

import { useQueryState } from 'nuqs'
import { useTransition } from 'react'
import { searchSortParser, SORT_OPTIONS } from './searchParsers'

export function SearchFilters() {
  const [sort, setSort] = useQueryState('sort', searchSortParser)
  const [, startTransition] = useTransition()

  function handleSort(value: string) {
    startTransition(() => { setSort(value) })
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {SORT_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleSort(value)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
            sort === value
              ? 'border-red-600 bg-red-600/20 text-red-400'
              : 'border-white/10 bg-white/5 text-white/70 active:border-white/20'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
