import Image from 'next/image'
import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchActressList, fetchItemList } from '@/lib/dmm/client'
import { GridCard } from '@/components/product/GridCard'
import { WorkTabs, type WorkTab } from './WorkTabs'

export const revalidate = 3600
export const dynamicParams = true

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

// リクエスト内で generateMetadata とページ本体が同じキャッシュエントリを共有する
// (数値キーで React.cache() の値等値比較が有効になる)
const getActressById = cache(async (actressId: number) =>
  Promise.resolve()
    .then(() => fetchActressList({ actress_id: actressId }))
    .catch(() => null)
)

export async function generateStaticParams() {
  const result = await fetchActressList({ hits: 100 }).catch(() => null)
  return (result?.actress ?? []).map((a) => ({ id: a.id }))
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const actressId = parseInt(id)
  if (isNaN(actressId)) return { title: '女優ページ' }

  const result = await getActressById(actressId)
  const actress = result?.actress[0]
  if (!actress) return { title: '女優ページ' }

  const stats = [
    actress.bust ? `B${actress.bust}` : '',
    actress.waist ? `W${actress.waist}` : '',
    actress.hip ? `H${actress.hip}` : '',
    actress.height ? `身長${actress.height}cm` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title: actress.name,
    description: `${actress.name}の全作品一覧。${stats}`,
    alternates: { canonical: `/actress/${id}` },
    openGraph: {
      type: 'profile',
      url: `/actress/${id}`,
      title: `${actress.name} | FANZA おすすめ`,
      description: `${actress.name}の全作品一覧。${stats}`,
      images: actress.imageURL?.large ? [{ url: actress.imageURL.large, alt: actress.name }] : undefined,
    },
  }
}

export default async function ActressDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'latest' } = await searchParams
  const currentTab = (tab === 'popular' ? 'popular' : 'latest') as WorkTab

  const actressId = parseInt(id)

  if (isNaN(actressId)) {
    return <ActressNotFound id={id} />
  }

  const [actressResult, worksResult] = await Promise.all([
    getActressById(actressId),
    Promise.resolve()
      .then(() => fetchItemList({
        article: 'actress',
        article_id: actressId,
        service: 'digital',
        floor: 'videoa',
        hits: 30,
        sort: currentTab === 'popular' ? 'rank' : 'date',
      }))
      .catch(() => null),
  ])

  // API エラー（null）→ 一時障害のためリトライ画面（永続的な 404 にしない）
  if (actressResult === null) {
    return <ActressRetry id={id} />
  }

  const actress = actressResult.actress[0]

  // 女優が存在しない → CF Workers で notFound() が 500 になるため直接 UI を返す
  if (!actress) {
    return <ActressNotFound id={id} />
  }

  const works = worksResult?.items ?? []
  const imageUrl = actress.imageURL?.large ?? actress.imageURL?.small ?? null

  // 出演作品からジャンルを集計（出現頻度順・上位8件）
  const genreCountMap = new Map<number, { name: string; count: number }>()
  for (const item of works) {
    for (const g of item.iteminfo?.genre ?? []) {
      if (g.id == null || !g.name) continue
      const prev = genreCountMap.get(g.id)
      genreCountMap.set(g.id, { name: g.name, count: (prev?.count ?? 0) + 1 })
    }
  }
  const relatedGenres = [...genreCountMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([genreId, { name }]) => ({ id: genreId, name }))

  const profileStats = [
    actress.height ? { label: '身長', value: `${actress.height}cm` } : null,
    actress.bust
      ? { label: 'B', value: `${actress.bust}cm${actress.cup ? ` (${actress.cup}カップ)` : ''}` }
      : null,
    actress.waist ? { label: 'W', value: `${actress.waist}cm` } : null,
    actress.hip ? { label: 'H', value: `${actress.hip}cm` } : null,
    actress.birthday ? { label: '生年月日', value: actress.birthday } : null,
  ].filter((s): s is { label: string; value: string } => s !== null)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: actress.name,
    ...(actress.ruby ? { alternateName: actress.ruby } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    jobTitle: '女優',
    url: `${SITE_URL}/actress/${id}`,
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* プロフィールヘッダー */}
      <div className="flex gap-4 border-b border-white/8 px-4 py-5">
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={actress.name}
              fill
              className="object-cover"
              priority
              sizes="80px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl text-white/10">
              ?
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-1">
          <span
            className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            ACTRESS
          </span>
          <h1 className="text-[22px] font-black leading-none tracking-tight text-white">
            {actress.name}
          </h1>
          {actress.ruby && (
            <p className="text-[11px] text-white/55">{actress.ruby}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {profileStats.map((s) => (
              <span key={s.label} className="text-[11px] text-white/70">
                <span className="text-white/50">{s.label}: </span>
                {s.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FANZA リンク + PR */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="text-[9px] text-white/40">PR · FANZAアフィリエイトリンク</p>
        {actress.listURL?.digital && (
          <a
            href={actress.listURL.digital}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-red-700/50 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:border-red-500 hover:text-red-300 active:opacity-70"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            FANZAで全作品を見る →
          </a>
        )}
      </div>

      {/* 関連ジャンル */}
      {relatedGenres.length > 0 && (
        <div className="border-b border-white/8 px-4 pb-3 pt-2">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-white/40">GENRE</p>
          <div className="flex flex-wrap gap-1.5">
            {relatedGenres.map((g) => (
              <a
                key={g.id}
                href={`/genre/${g.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:border-red-500/40 hover:bg-red-950/30 hover:text-white active:opacity-70"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {g.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* タブ */}
      <WorkTabs actressId={id} currentTab={currentTab} />

      {/* 作品グリッド */}
      <div className="px-3 pt-3">
        {works.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-white/55">作品が見つかりませんでした</p>
        ) : (
          <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
            {works.map((item, i) => (
              <GridCard
                key={item.content_id}
                item={item}
                featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function ActressRetry({ id }: { id: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <p className="text-[14px] text-white/70">データを取得できませんでした</p>
      <a
        href={`/actress/${id}`}
        className="rounded-lg border border-red-700/50 px-4 py-2 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        再読み込み
      </a>
    </main>
  )
}

function ActressNotFound({ id: _id }: { id: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="text-center">
        <p className="text-[14px] text-white/70">女優情報が見つかりませんでした</p>
      </div>
      <Link
        href="/ranking?period=actress"
        className="rounded-lg border border-red-700/50 px-5 py-2.5 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        人気女優に戻る
      </Link>
    </main>
  )
}
