'use client'

import { useQueryState } from 'nuqs'
import { useTransition, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { searchSortParser, searchQueryParser } from './searchParsers'

export function SearchInput() {
  const [q, setQ] = useQueryState('q', searchQueryParser)
  const [, setSort] = useQueryState('sort', searchSortParser)
  const [, setPage] = useQueryState('page', { defaultValue: 1, parse: Number, serialize: String })
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // マウント時に入力フォーカス
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        setQ(value || null)
        setPage(1)
      })
    }, 300)
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ''
    startTransition(() => {
      setQ(null)
      setSort(null)
      setPage(1)
    })
  }

  return (
    <div className="relative flex items-center">
      <Search
        size={16}
        className={`absolute left-3 transition-colors ${isPending ? 'text-red-400' : 'text-white/55'}`}
      />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        defaultValue={q ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="作品名・女優名・ジャンルで検索..."
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-9 text-[14px] text-white placeholder:text-white/50 focus:border-white/20 focus:outline-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />
      {q && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-white/55 active:text-white/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
