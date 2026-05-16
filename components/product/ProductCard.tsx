import Image from 'next/image'
import type { DmmItem } from '@/types/dmm'
import { parsePrice, calcDiscountRate } from '@/lib/ranking'

const IMG_W = 184
const IMG_H = 250
// awsimgsrc.dmm.co.jp のリサイズAPIに渡す幅（2x Retina 想定）
const CDN_W = 368
const CDN_H = 500

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTg0IiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExMTExIi8+PC9zdmc+'

function buildImageUrl(raw: string): { src: string; unoptimized: boolean } {
  try {
    const url = new URL(raw)
    if (url.hostname === 'awsimgsrc.dmm.co.jp') {
      url.searchParams.set('w', String(CDN_W))
      url.searchParams.set('h', String(CDN_H))
      url.searchParams.set('t', 'margin')
      return { src: url.toString(), unoptimized: true }
    }
  } catch {
    // fall through
  }
  return { src: raw, unoptimized: false }
}

type Props = {
  item: DmmItem
  rank?: number
  overlaySlot?: React.ReactNode
}

export function ProductCard({ item, rank, overlaySlot }: Props) {
  const price = parsePrice(item.prices.price)
  const listPrice = parsePrice(item.prices.list_price)
  const discount = calcDiscountRate(item.prices.price, item.prices.list_price)
  const reviewAvg = item.review?.average ? parseFloat(item.review.average) : null
  const reviewCount = item.review?.count ?? 0
  const sampleL = item.sampleImageURL?.sample_l?.image
  const rawImageUrl =
    sampleL?.[9] ??
    sampleL?.[8] ??
    sampleL?.[7] ??
    sampleL?.[6] ??
    sampleL?.[0] ??
    item.imageURL.list ??
    item.imageURL.large ??
    item.imageURL.small ??
    null
  const imageProps = rawImageUrl ? buildImageUrl(rawImageUrl) : null

  return (
    <div className="flex flex-col">
      {/* 画像リンク（バッジ類はここに内包） */}
      <a
        href={item.affiliateURL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-lg bg-white/5"
      >
        {imageProps ? (
          <Image
            src={imageProps.src}
            alt={item.title}
            width={IMG_W}
            height={IMG_H}
            unoptimized={imageProps.unoptimized}
            className="aspect-[184/250] w-full object-cover"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            sizes="(max-width: 639px) calc(50vw - 14px), (max-width: 767px) calc(33vw - 14px), (max-width: 1023px) calc(25vw - 14px), (max-width: 1279px) calc(20vw - 14px), calc(16vw - 14px)"
          />
        ) : (
          <div className="aspect-[184/250] w-full bg-white/5" />
        )}

        {/* PR表記 */}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/50 backdrop-blur-sm">
          PR
        </span>

        {/* 割引バッジ */}
        {discount !== null && discount >= 5 && (
          <span className="absolute right-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white">
            {discount}%OFF
          </span>
        )}

        {/* ランクバッジ */}
        {rank !== undefined && (
          <span
            className={`absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
              rank === 1
                ? 'bg-yellow-400 text-black'
                : rank === 2
                  ? 'bg-white/80 text-black'
                  : rank === 3
                    ? 'bg-orange-400 text-black'
                    : 'bg-black/70 text-white/70'
            }`}
          >
            {rank}
          </span>
        )}

        {overlaySlot}
      </a>

      {/* テキスト情報 */}
      <div className="mt-1.5 flex flex-col gap-1">
        <p className="line-clamp-2 text-[11px] leading-[1.4] text-white/70">{item.title}</p>

        {/* 価格 */}
        <div className="flex flex-wrap items-center gap-1">
          {listPrice !== null && discount !== null && (
            <span className="text-[10px] text-white/30 line-through">
              ¥{listPrice.toLocaleString('ja-JP')}
            </span>
          )}
          {price !== null && (
            <span
              className={`font-bold tabular-nums ${discount ? 'text-[13px] text-red-400' : 'text-[12px] text-white/60'}`}
            >
              ¥{price.toLocaleString('ja-JP')}
            </span>
          )}
        </div>

        {/* レビュー */}
        {reviewAvg !== null && reviewCount > 0 && (
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-yellow-400">★</span>
            <span className="text-[10px] text-white/50">{reviewAvg.toFixed(1)}</span>
            <span className="text-[9px] text-white/25">({reviewCount})</span>
          </div>
        )}
      </div>
    </div>
  )
}
