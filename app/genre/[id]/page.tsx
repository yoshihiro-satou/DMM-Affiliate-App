import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchItemList } from '@/lib/dmm/client'
import { GridCard } from '@/components/product/GridCard'

export const dynamic = 'force-dynamic'

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const genreId = parseInt(id)
  if (isNaN(genreId)) return { title: 'ジャンル' }

  const data = await getGenreData(genreId).catch(() => null)
  const genreName = data?.genreName ?? `ジャンル${id}`

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

  if (isNaN(genreId)) return <GenreNotFound id={id} />

  const data = await getGenreData(genreId).catch(() => null)

  // API エラー → 一時障害として再試行を促す（永続的な 404 にしない）
  if (data === null) return <GenreRetry id={id} />

  // 作品なし → IDが不正または削除済み
  if (!data.result.items.length) return <GenreNotFound id={id} />

  const { result, genreName } = data

  // 作品データから女優を集計（追加 API なし）→ 出現頻度順・上位8件
  const actressCountMap = new Map<number, { name: string; count: number }>()
  for (const item of result.items) {
    for (const a of item.iteminfo?.actress ?? []) {
      if (a.id == null || !a.name) continue
      const prev = actressCountMap.get(a.id)
      actressCountMap.set(a.id, { name: a.name, count: (prev?.count ?? 0) + 1 })
    }
  }
  const topActresses = [...actressCountMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([actressId, { name, count }]) => ({ id: actressId, name, count }))

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

      {/* 関連女優 */}
      {topActresses.length > 0 && (
        <div className="border-t border-white/8 pb-6 pt-5">
          <div className="mb-3 flex items-center gap-2 px-4">
            <span className="text-[13px] font-black tracking-tight text-white">関連女優</span>
            <span className="text-[11px] text-white/35">{topActresses.length}人</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topActresses.map((a) => (
              <a
                key={a.id}
                href={`/actress/${a.id}`}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 hover:border-red-500/40 hover:bg-red-950/30 active:opacity-70"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="whitespace-nowrap text-[13px] font-semibold text-white/90">{a.name}</span>
                <span className="text-[10px] text-white/35">{a.count}作品</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function GenreRetry({ id }: { id: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <p className="text-[14px] text-white/70">データを取得できませんでした</p>
      <a
        href={`/genre/${id}`}
        className="rounded-lg border border-red-700/50 px-4 py-2 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        再読み込み
      </a>
    </main>
  )
}

function GenreNotFound({ id: _id }: { id: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="text-center">
        <p className="text-[14px] text-white/70">ジャンル情報が見つかりませんでした</p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-red-700/50 px-5 py-2.5 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        ホームに戻る
      </Link>
    </main>
  )
}
