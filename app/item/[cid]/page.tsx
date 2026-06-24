import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { parsePrice } from '@/lib/ranking'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'
import type { DmmItem } from '@/types/dmm'

// awsimgsrc.dmm.co.jp のリサイズAPIで 2x Retina を取得し高精細化（series/ProductCard と同方針）。
function buildDmmImageUrl(raw: string, w = 368, h = 500): { src: string; unoptimized: boolean } {
  try {
    const url = new URL(raw)
    if (url.hostname === 'awsimgsrc.dmm.co.jp') {
      url.searchParams.set('w', String(w))
      url.searchParams.set('h', String(h))
      url.searchParams.set('t', 'margin')
      return { src: url.toString(), unoptimized: true }
    }
  } catch {
    // fall through
  }
  return { src: raw, unoptimized: false }
}

export const revalidate = 3600
export const dynamicParams = true

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

// cid 単品の全詳細を取得（fetchItemList は cache() でリクエスト内 dedup＝metadata/本文の2回呼びでも1回）。
async function getItem(cid: string): Promise<DmmItem | null> {
  const res = await fetchItemList({ cid, hits: 1 }).catch(() => null)
  return res?.items?.[0] ?? null
}

type Props = {
  params: Promise<{ cid: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cid } = await params
  const item = await getItem(cid)
  if (!item) return { title: '作品' }

  const actress = item.iteminfo?.actress?.[0]?.name
  const genres = (item.iteminfo?.genre ?? []).slice(0, 3).map((g) => g.name).filter(Boolean)
  const title = actress
    ? `${item.title}｜${actress}のFANZA動画 サンプル・レビュー`
    : `${item.title}｜FANZA動画 サンプル・レビュー`
  const reviewNote =
    item.review?.count && item.review?.average
      ? `★${item.review.average}（${item.review.count}件）の高評価。`
      : ''
  const description = `${item.title}${actress ? `（出演：${actress}）` : ''}のサンプル画像・レビュー・価格をまとめてチェック。${reviewNote}${
    genres.length > 0 ? `ジャンル：${genres.join('・')}。` : ''
  }セール中なら割引価格も掲載、気になればそのままFANZAの視聴ページへ。毎日0時にセール速報も配信中（登録不要・無料）。`

  const thumbnail = item.imageURL.large ?? item.imageURL.list ?? undefined

  return {
    title,
    description,
    alternates: { canonical: `/item/${cid}` },
    openGraph: {
      url: `/item/${cid}`,
      title: `${title} | FANZAピックス`,
      description,
      images: thumbnail ? [thumbnail] : undefined,
    },
  }
}

export default async function ItemDetailPage({ params }: Props) {
  const { cid } = await params
  const item = await getItem(cid)
  if (!item) return <ItemNotFound />

  const actresses = (item.iteminfo?.actress ?? []).filter((a) => a.id !== undefined && a.name)
  const genres = (item.iteminfo?.genre ?? []).filter((g) => g.id !== undefined && g.name)
  const series = (item.iteminfo?.series ?? []).filter((s) => s.id !== undefined && s.name)
  const maker = item.iteminfo?.maker?.[0]?.name
  const mainActress = actresses[0]

  // 関連作品＝同じ女優の人気作（自分を除く・最大8件）。内部リンク網を作品ページ間に張る。
  // 単品の配信動画のみ（service_code=digital）に絞る＝月額見放題(monthly/見放題ch)・通販DVD(mono)を除外。
  const related = mainActress?.id
    ? (
        (await fetchItemList({
          article: 'actress',
          article_id: mainActress.id,
          sort: 'rank',
          hits: 20,
        }).catch(() => null))?.items ?? []
      )
        .filter((it) => it.content_id !== item.content_id && it.service_code === 'digital')
        .slice(0, 8)
    : []

  const price = parsePrice(item.prices.price)
  const listPrice = parsePrice(item.prices.list_price)
  const onSale = price !== null && listPrice !== null && listPrice > price
  const discount = onSale ? Math.round((1 - price / listPrice) * 100) : 0

  const releaseDate = item.date?.slice(0, 10)
  const reviewCount = item.review?.count ?? 0
  const reviewAvg = item.review?.average ? parseFloat(item.review.average) : null

  // サンプル画像（大優先）。本文の厚み＋視認性。
  const sampleImages =
    item.sampleImageURL?.sample_l?.image ?? item.sampleImageURL?.sample_s?.image ?? []

  const rawPackage = item.imageURL.large ?? item.imageURL.list ?? item.imageURL.small ?? null
  const pkg = rawPackage ? buildDmmImageUrl(rawPackage, 540, 360) : null

  // 決定論の導入文（frontmatter由来＝誤情報リスクなし・薄さ回避）。
  const proseParts: string[] = []
  proseParts.push(`「${item.title}」`)
  if (mainActress) proseParts.push(`は${mainActress.name}が出演するFANZAの動画作品です。`)
  else proseParts.push(`はFANZAで配信中の動画作品です。`)
  if (genres.length > 0) proseParts.push(`ジャンルは${genres.slice(0, 4).map((g) => g.name).join('・')}。`)
  if (series[0]) proseParts.push(`シリーズ「${series[0].name}」の作品です。`)
  if (onSale) proseParts.push(`現在セール中で通常より${discount}%お得に視聴できます。`)
  proseParts.push(`サンプル画像・レビュー・価格を確認し、気になればそのままFANZAの視聴ページへ。`)
  const prose = proseParts.join('')

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: item.title,
      ...(pkg ? { image: rawPackage } : {}),
      description: prose,
      ...(maker ? { brand: { '@type': 'Brand', name: maker } } : {}),
      ...(releaseDate ? { releaseDate } : {}),
      url: `${SITE_URL}/item/${cid}`,
      ...(price !== null
        ? {
            offers: {
              '@type': 'Offer',
              price,
              priceCurrency: 'JPY',
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/item/${cid}`,
            },
          }
        : {}),
      ...(reviewCount > 0 && reviewAvg !== null
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: reviewAvg,
              reviewCount,
            },
          }
        : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
        ...(mainActress?.id
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: mainActress.name,
                item: `${SITE_URL}/actress/${mainActress.id}`,
              },
              { '@type': 'ListItem', position: 3, name: item.title, item: `${SITE_URL}/item/${cid}` },
            ]
          : [{ '@type': 'ListItem', position: 2, name: item.title, item: `${SITE_URL}/item/${cid}` }]),
      ],
    },
  ]

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* パンくず（内部リンク） */}
      <nav className="flex items-center gap-1.5 px-4 pt-4 text-[11px] text-white/45">
        <Link href="/" className="shrink-0 hover:text-white/70">
          ホーム
        </Link>
        {mainActress?.id && (
          <>
            <span className="text-white/25">/</span>
            <Link href={`/actress/${mainActress.id}`} className="shrink-0 truncate hover:text-white/70">
              {mainActress.name}
            </Link>
          </>
        )}
        <span className="text-white/25">/</span>
        <span className="truncate text-white/60">{item.title}</span>
      </nav>

      {/* ヘッダー：パッケージ＋タイトル＋主CTA */}
      <div className="px-4 pt-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          FANZA動画
        </span>
        <h1 className="mt-1.5 text-[19px] font-black leading-snug tracking-tight text-white">
          {item.title}
        </h1>

        <div className="mt-3 flex gap-4">
          <a
            href={item.affiliateURL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="relative block w-36 shrink-0 overflow-hidden rounded-lg bg-white/5"
          >
            {pkg ? (
              <Image
                src={pkg.src}
                alt={item.title}
                width={288}
                height={192}
                unoptimized={pkg.unoptimized}
                priority
                sizes="144px"
                className="w-full object-cover"
              />
            ) : (
              <div className="aspect-[3/2] w-full bg-white/5" />
            )}
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold tracking-wider text-white/65 backdrop-blur-sm">
              PR
            </span>
          </a>

          <div className="flex min-w-0 flex-col justify-center gap-2">
            {/* 価格 */}
            <div className="flex items-baseline gap-2">
              {price !== null ? (
                <>
                  <span className="text-[20px] font-black tabular-nums text-white">
                    ¥{price.toLocaleString('ja-JP')}
                  </span>
                  {onSale && (
                    <>
                      <span className="text-[12px] tabular-nums text-white/40 line-through">
                        ¥{listPrice!.toLocaleString('ja-JP')}
                      </span>
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {discount}%OFF
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-[13px] text-white/55">FANZAで価格を見る</span>
              )}
            </div>

            {releaseDate && <p className="text-[11px] text-white/45">配信開始 {releaseDate}</p>}

            <a
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-2.5 text-[14px] font-bold text-white transition-opacity active:opacity-80"
            >
              FANZAで今すぐ見る →
            </a>
          </div>
        </div>
      </div>

      {/* 高評価ハイライト（社会的証明・APIの average/count のみで構成＝本文は出さない） */}
      {reviewCount > 0 && reviewAvg !== null && (
        <section className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/[0.06] px-4 py-3">
            <div className="flex shrink-0 flex-col items-center">
              <span className="text-[22px] font-black leading-none tabular-nums text-yellow-400">
                {reviewAvg.toFixed(2)}
              </span>
              <span className="mt-0.5 text-[9px] text-white/40">/ 5.0</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="relative inline-block whitespace-nowrap text-[14px] leading-none"
                  aria-label={`5点満点中${reviewAvg.toFixed(2)}点`}
                >
                  <span className="text-white/15">★★★★★</span>
                  <span
                    className="absolute inset-0 overflow-hidden whitespace-nowrap text-yellow-400"
                    style={{ width: `${Math.min(100, (reviewAvg / 5) * 100)}%` }}
                  >
                    ★★★★★
                  </span>
                </span>
                {reviewAvg >= 4 && (
                  <span className="rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    高評価
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug text-white/60">
                FANZA利用者{reviewCount}件のレビューで平均★{reviewAvg.toFixed(2)}。
                {reviewAvg >= 4.5
                  ? '満足度の高い人気作です。'
                  : reviewAvg >= 4
                    ? '評価の高い注目作です。'
                    : ''}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* PR */}
      <p className="px-4 pb-1 pt-3 text-[9px] text-white/40">PR · FANZAアフィリエイトリンク</p>

      {/* 導入文（SEO・検索意図に一致するテキストコンテンツ） */}
      <p className="border-y border-white/8 px-4 py-3 text-[12px] leading-relaxed text-white/55">
        {prose}
      </p>

      {/* サンプル画像 */}
      {sampleImages.length > 0 && (
        <section className="px-3 pt-4">
          <h2 className="mb-2 px-1 text-[12px] font-bold text-white/70">サンプル画像</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {sampleImages.slice(0, 9).map((src, i) => (
              <a
                key={i}
                href={item.affiliateURL}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="relative block overflow-hidden rounded bg-white/5"
              >
                <Image
                  src={src}
                  alt={`${item.title} サンプル${i + 1}`}
                  width={176}
                  height={120}
                  unoptimized
                  sizes="(max-width: 639px) 33vw, 180px"
                  className="aspect-[176/120] w-full object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 作品情報テーブル（内部リンク網） */}
      <section className="mt-5 border-t border-white/8 px-4 pt-4">
        <h2 className="mb-2 text-[12px] font-bold text-white/70">作品情報</h2>
        <dl className="space-y-2 text-[12px]">
          {actresses.length > 0 && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-white/45">出演</dt>
              <dd className="flex flex-wrap gap-1.5">
                {actresses.slice(0, 8).map((a) => (
                  <Link
                    key={a.id}
                    href={`/actress/${a.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/70 hover:border-red-500/50 hover:text-white"
                  >
                    {a.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {series.length > 0 && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-white/45">シリーズ</dt>
              <dd className="flex flex-wrap gap-1.5">
                {series.slice(0, 4).map((s) => (
                  <Link
                    key={s.id}
                    href={`/series/${s.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/70 hover:border-red-500/50 hover:text-white"
                  >
                    {s.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {genres.length > 0 && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-white/45">ジャンル</dt>
              <dd className="flex flex-wrap gap-1.5">
                {genres.slice(0, 12).map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/60 hover:border-red-500/50 hover:text-white"
                  >
                    {g.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {maker && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-white/45">メーカー</dt>
              <dd className="text-white/60">{maker}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Telegram 誘導 */}
      <div className="mt-6 px-4">
        <TelegramJoinCard placement="item" />
      </div>

      {/* 関連作品（同じ女優の人気作・作品ページ間の内部リンク） */}
      {related.length > 0 && (
        <section className="mt-6 border-t border-white/8 px-3 pt-5">
          <h2 className="mb-2 px-1 text-[12px] font-bold text-white/70">
            {mainActress?.name ? `${mainActress.name}の人気作` : '関連作品'}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {related.map((it) => {
              // DMM の large(...pl.jpg)は横長パッケージ。ネイティブの横長比率で表示し、
              // 縦長枠への押し込み（クロップ歪み＋拡大による画質劣化）を回避する（上部パッケージと同方針）。
              const rawImg = it.imageURL.large ?? it.imageURL.list ?? it.imageURL.small ?? null
              const img = rawImg ? buildDmmImageUrl(rawImg, 480, 320) : null
              const p = parsePrice(it.prices.price)
              return (
                <Link key={it.content_id} href={`/item/${it.content_id}`} className="flex flex-col">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-white/5">
                    {img ? (
                      <Image
                        src={img.src}
                        alt={it.title}
                        width={300}
                        height={200}
                        unoptimized={img.unoptimized}
                        sizes="(max-width: 639px) calc(50vw - 14px), (max-width: 767px) calc(33vw - 14px), 25vw"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/5" />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 px-0.5 text-[10px] leading-tight text-white/60">
                    {it.title}
                  </p>
                  {p !== null && (
                    <p className="px-0.5 text-[10px] font-bold tabular-nums text-white/65">
                      ¥{p.toLocaleString('ja-JP')}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

function ItemNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="text-center">
        <p className="text-[14px] text-white/70">作品が見つかりませんでした</p>
      </div>
      <Link
        href="/ranking"
        className="rounded-lg border border-red-700/50 px-5 py-2.5 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        ランキングを見る
      </Link>
    </main>
  )
}
