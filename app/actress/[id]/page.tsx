import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchActressList, fetchItemList } from '@/lib/dmm/client'
import { GridCard } from '@/components/product/GridCard'
import { WorkTabs, type WorkTab } from './WorkTabs'

export const revalidate = 3600
export const dynamicParams = true

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

export async function generateStaticParams() {
  const [r1, r2] = await Promise.all([
    fetchActressList({ hits: 100, offset: 1, sort: 'id' }).catch(() => null),
    fetchActressList({ hits: 100, offset: 101, sort: 'id' }).catch(() => null),
  ])
  return [
    ...(r1?.actress ?? []),
    ...(r2?.actress ?? []),
  ].map((a) => ({ id: a.id }))
}

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const actressId = parseInt(id)
  if (isNaN(actressId)) return { title: '女優ページ' }

  const result = await fetchActressList({ actress_id: actressId }).catch(() => null)
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
    openGraph: {
      title: `${actress.name} | FANZA おすすめ`,
      images: actress.imageURL?.large ? [actress.imageURL.large] : undefined,
    },
  }
}

export default async function ActressDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'latest' } = await searchParams
  const currentTab = (tab === 'popular' ? 'popular' : 'latest') as WorkTab

  const actressId = parseInt(id)
  if (isNaN(actressId)) notFound()

  const [actressResult, worksResult] = await Promise.all([
    fetchActressList({ actress_id: actressId }).catch(() => null),
    fetchItemList({
      article: 'actress',
      article_id: actressId,
      service: 'digital',
      floor: 'videoa',
      hits: 30,
      sort: currentTab === 'popular' ? 'rank' : 'date',
    }).catch(() => null),
  ])

  const actress = actressResult?.actress[0]
  if (!actress) notFound()

  const works = worksResult?.items ?? []
  const imageUrl = actress.imageURL?.large ?? actress.imageURL?.small ?? null

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
            <p className="text-[11px] text-white/30">{actress.ruby}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {profileStats.map((s) => (
              <span key={s.label} className="text-[11px] text-white/50">
                <span className="text-white/25">{s.label}: </span>
                {s.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FANZA リンク + PR */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="text-[9px] text-white/20">PR · FANZAアフィリエイトリンク</p>
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

      {/* タブ */}
      <WorkTabs actressId={id} currentTab={currentTab} />

      {/* 作品グリッド */}
      <div className="px-3 pt-3">
        {works.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-white/30">作品が見つかりませんでした</p>
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
