import Image from 'next/image'
import type { DmmItem } from '@/types/dmm'
import { parsePrice, calcDiscountRate } from '@/lib/ranking'

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTExMTExIi8+PC9zdmc+'

type Props = {
  item: DmmItem
  rank?: number
  featured?: boolean
}

export function ProductCard({ item, rank, featured = false }: Props) {
  const price = parsePrice(item.prices.price)
  const listPrice = parsePrice(item.prices.list_price)
  const discount = calcDiscountRate(item.prices.price, item.prices.list_price)
  const reviewAvg = item.review?.average ? parseFloat(item.review.average) : null
  const reviewCount = item.review?.count ?? 0
  // list = 一覧用縦パッケージ画像（正しいコンテンツ）
  const imageUrl = item.imageURL.list ?? item.imageURL.large ?? item.imageURL.small ?? null

  return (
    <div className="relative flex flex-col">
      {/* PR表記 */}
      <span className="absolute left-1.5 top-1.5 z-10 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/50 backdrop-blur-sm">
        PR
      </span>

      {/* 割引バッジ */}
      {discount !== null && discount >= 5 && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white">
          {discount}%OFF
        </span>
      )}

      {/* ランクバッジ */}
      {rank !== undefined && (
        <span
          className={`absolute left-1.5 bottom-[calc(100%-108px)] z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
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

      {/* 画像リンク */}
      <a
        href={item.affiliateURL}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg bg-white/5"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.title}
            width={240}
            height={320}
            className={`w-full object-cover ${featured ? 'aspect-[3/4]' : 'aspect-[2/3]'}`}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 17vw"
          />
        ) : (
          <div className={`w-full bg-white/5 ${featured ? 'aspect-[3/4]' : 'aspect-[2/3]'}`} />
        )}
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
            <span className={`font-bold tabular-nums ${discount ? 'text-[13px] text-red-400' : 'text-[12px] text-white/60'}`}>
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
