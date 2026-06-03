import Image from 'next/image'
import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchActressList, fetchItemList } from '@/lib/dmm/client'
import { getOshiActresses } from '@/lib/oshi'
import { GridCard } from '@/components/product/GridCard'
import { OshiCtaInline } from '@/components/actress/OshiCtaInline'
import { WorkTabs, type WorkTab } from './WorkTabs'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

async function getActressById(actressId: number) {
  return fetchActressList({ actress_id: actressId }).catch(() => null)
}

async function getActressWorkCount(actressId: number): Promise<number | null> {
  const result = await fetchItemList({
    article: 'actress',
    article_id: actressId,
    service: 'digital',
    floor: 'videoa',
    hits: 1,
  }).catch(() => null)
  return result?.total_count ?? null
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const actressId = parseInt(id)
  if (isNaN(actressId)) return { title: '女優ページ' }

  const [result, totalCount] = await Promise.all([
    getActressById(actressId),
    getActressWorkCount(actressId),
  ])
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

  const countText = totalCount ? `全${totalCount}作品。` : ''
  const statsText = stats ? `${stats}。` : ''
  const title = `${actress.name} おすすめFANZA作品一覧`
  const description = `${actress.name}のFANZAおすすめ作品一覧。${countText}${statsText}最新作・人気作をレビュー順に掲載。`

  return {
    title,
    description,
    alternates: { canonical: `/actress/${id}` },
    openGraph: {
      type: 'profile',
      url: `/actress/${id}`,
      title: `${title} | FANZAピックス`,
      description,
      // OGP画像は app/actress/[id]/opengraph-image.tsx の動的生成を使う（追加21）
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

  const [actressResult, worksResult, oshiList] = await Promise.all([
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
    getOshiActresses(),
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
  const totalWorks = worksResult?.total_count ?? null
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

  // 人気作品ランキング（レビュー評価順 TOP5・テキストSEO用）
  const popularWorks = [...works]
    .filter((w) => w.review?.average)
    .sort((a, b) => Number(b.review?.average ?? 0) - Number(a.review?.average ?? 0))
    .slice(0, 5)

  // 共演女優（出演作からの共演頻度・上位8人）
  const coActressMap = new Map<number, { name: string; count: number }>()
  for (const item of works) {
    for (const a of item.iteminfo?.actress ?? []) {
      if (a.id == null || a.id === actressId || !a.name) continue
      const prev = coActressMap.get(a.id)
      coActressMap.set(a.id, { name: a.name, count: (prev?.count ?? 0) + 1 })
    }
  }
  const coActresses = [...coActressMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([coId, { name, count }]) => ({ id: coId, name, count }))

  const profileStats = [
    actress.height ? { label: '身長', value: `${actress.height}cm` } : null,
    actress.bust
      ? { label: 'B', value: `${actress.bust}cm${actress.cup ? ` (${actress.cup}カップ)` : ''}` }
      : null,
    actress.waist ? { label: 'W', value: `${actress.waist}cm` } : null,
    actress.hip ? { label: 'H', value: `${actress.hip}cm` } : null,
    actress.birthday ? { label: '生年月日', value: actress.birthday } : null,
  ].filter((s): s is { label: string; value: string } => s !== null)

  const jsonLdPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: actress.name,
    ...(actress.ruby ? { alternateName: actress.ruby } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    jobTitle: '女優',
    url: `${SITE_URL}/actress/${id}`,
  }

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '人気女優', item: `${SITE_URL}/ranking?period=actress` },
      { '@type': 'ListItem', position: 3, name: actress.name, item: `${SITE_URL}/actress/${id}` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
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
          {totalWorks != null && totalWorks > 0 && (
            <p className="text-[11px] text-white/45">
              FANZA動画 全{totalWorks.toLocaleString()}作品
            </p>
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

      {/* 推しに設定 CTA（施策3） */}
      <OshiCtaInline
        actressId={id}
        actressName={actress.name}
        initialIsOshi={oshiList.some((o) => o.id === id)}
        initialOshiCount={oshiList.length}
      />

      {/* FANZA リンク + PR + X シェア */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="text-[9px] text-white/40">PR · FANZAアフィリエイトリンク</p>
        <div className="flex items-center gap-2">
          {works[0] && (
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `${actress.name} の新作来た🎉\n「${works[0].title}」\n#FANZAピックス`
              )}&url=${encodeURIComponent(`${SITE_URL}/actress/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/50 hover:border-white/30 hover:text-white/80 active:opacity-70"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              𝕏 シェア
            </a>
          )}
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

      {/* 人気作品ランキング（SEOテキスト・指名クエリ向け） */}
      {popularWorks.length > 0 && (
        <section className="border-t border-white/8 px-4 pb-6 pt-5">
          <h2 className="mb-3 text-[15px] font-black tracking-tight text-white">
            {actress.name}の人気作品ランキング
          </h2>
          <ol className="flex flex-col gap-2">
            {popularWorks.map((item, i) => (
              <li key={item.content_id} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70">
                  {i + 1}
                </span>
                <a
                  href={item.affiliateURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 flex-1 text-[12px] text-white/70 hover:text-white"
                >
                  {item.title}
                </a>
                {item.review?.average && (
                  <span className="shrink-0 text-[10px] tabular-nums text-amber-400/80">
                    ★{Number(item.review.average).toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[9px] text-white/35">PR · レビュー評価順</p>
        </section>
      )}

      {/* 関連女優（共演・内部リンク） */}
      {coActresses.length > 0 && (
        <section className="border-t border-white/8 px-4 pb-8 pt-5">
          <h2 className="mb-3 text-[15px] font-black tracking-tight text-white">
            {actress.name}の関連女優
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {coActresses.map((a) => (
              <a
                key={a.id}
                href={`/actress/${a.id}`}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:border-red-500/40 hover:bg-red-950/30 hover:text-white active:opacity-70"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {a.name}
              </a>
            ))}
          </div>
        </section>
      )}
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
