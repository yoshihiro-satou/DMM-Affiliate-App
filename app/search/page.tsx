import type { Metadata } from 'next'
import { SearchInput } from '@/components/search/SearchInput'
import { SearchFilters } from '@/components/search/SearchFilters'
import { SearchResults } from '@/components/search/SearchResults'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '検索',
  description: '作品名・女優名・ジャンルで作品を検索',
}

export default function SearchPage() {
  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 border-b border-white/8 bg-[#080808]/95 px-4 pb-3 pt-4 backdrop-blur-sm">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          SEARCH
        </span>
        <h1 className="mt-1 mb-3 text-[22px] font-black tracking-tight text-white">検索</h1>
        <SearchInput />
        <div className="mt-2">
          <SearchFilters />
        </div>
      </div>

      <div className="px-4 pt-4">
        <SearchResults />
      </div>
    </main>
  )
}
