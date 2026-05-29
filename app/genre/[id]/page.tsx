import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchItemList, fetchGenreList } from '@/lib/dmm/client'
import { GridCard } from '@/components/product/GridCard'

export const revalidate = 3600
export const dynamicParams = true

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

type Props = {
  params: Promise<{ id: string }>
}

async function getGenreData(genreId: number) {
  const result = await fetchItemList({
    article: 'genre',
    article_id: genreId,
    hits: 40,
    service: 'digital',
    floor: 'videoa',
    sort: 'review',
  })
  const genreName =
    result.items[0]?.iteminfo?.genre?.find((g) => g.id === genreId)?.name ??
    `ジャンル${genreId}`
  return { result, genreName }
}

export async function generateStaticParams() {
  const genreResult = await fetchGenreList({ floor_id: '43', hits: 100 }).catch(() => null)
  return (genreResult?.genre ?? []).slice(0, 50).map((g) => ({
    id: String(g.genre_id),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const genreId = parseInt(id)
  if (isNaN(genreId)) return { title: 'ジャンル' }

  const { genreName } = await getGenreData(genreId).catch(() => ({ genreName: `ジャンル${id}`, result: null }))

  return {
    title: `${genreName} おすすめ作品`,
    description: `FANZAで人気の${genreName}作品一覧。レビュー評価の高い作品から厳選して紹介。`,
    alternates: { canonical: `/genre/${id}` },
    openGraph: {
      url: `/genre/${id}`,
      title: `${genreName} おすすめ作品 | FANZAピックス`,
      description: `FANZAで人気の${genreName}作品一覧。レビュー評価の高い作品から厳選して紹介。`,
    },
  }
}

export default async function GenrePage({ params }: Props) {
  const { id } = await params
  const genreId = parseInt(id)
  if (isNaN(genreId)) notFound()

  const data = await getGenreData(genreId).catch(() => null)
  if (!data || !data.result.items.length) notFound()
  const { result, genreName } = data

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${genreName} おすすめ作品`,
    itemListElement: result.items.slice(0, 10).map((item, i) => ({
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
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          GENRE
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{genreName}</h1>
        <p className="mt-0.5 text-[11px] text-white/55">
          PR · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
      </div>
      <div className="grid grid-cols-2 grid-flow-dense gap-2 px-3 pb-2 pt-2 md:grid-cols-4">
        {result.items.map((item, i) => (
          <GridCard
            key={item.content_id}
            item={item}
            featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
          />
        ))}
      </div>
    </main>
  )
}
