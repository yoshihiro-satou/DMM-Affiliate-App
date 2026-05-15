import Image from 'next/image'
import type { DmmItem } from '@/types/dmm'
import { parsePrice, calcDiscountRate } from '@/lib/ranking'

const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxMTExMTEiLz48L3N2Zz4='

function pickImage(item: DmmItem): string | null {
  const sl = item.sampleImageURL?.sample_l?.image
  return (
    sl?.[5] ??
    sl?.[4] ??
    sl?.[3] ??
    item.imageURL.list ??
    item.imageURL.large ??
    item.imageURL.small ??
    null
  )
}

function formatDeadline(dateEnd: string): string {
  const end = new Date(dateEnd.replace(' ', 'T'))
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const diffH = Math.ceil(diffMs / (1000 * 60 * 60))
  if (diffH <= 0) return '本日まで！'
  if (diffH <= 24) return `残り${diffH}時間`
  const diffD = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffD <= 1) return '明日まで'
  return `${end.getMonth() + 1}/${end.getDate()}まで`
}

type Props = {
  item: DmmItem
  rank?: number
  featured?: boolean
  dateEnd?: string
}

export function GridCard({ item, rank, featured = false, dateEnd }: Props) {
  const price = parsePrice(item.prices.price)
  const listPrice = parsePrice(item.prices.list_price)
  const discount = calcDiscountRate(item.prices.price, item.prices.list_price)
  const rawSrc = pickImage(item)

  return (
    <div className={featured ? 'col-span-2 row-span-2' : 'col-span-1'}>
      <a
        href={item.affiliateURL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full overflow-hidden rounded-lg bg-[#111]"
      >
        {rawSrc && (
          <Image
            src={rawSrc}
            alt={item.title}
            fill
            className="object-contain"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            sizes={
              featured
                ? '(max-width: 639px) 100vw, (max-width: 1023px) 66vw, 50vw'
                : '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw'
            }
          />
        )}

        {/* PR */}
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold tracking-wider text-white/40 backdrop-blur-sm">
          PR
        </span>

        {/* 割引バッジ */}
        {discount !== null && discount >= 5 && (
          <span
            className={`absolute right-1 top-1 rounded bg-red-600 px-1.5 py-px font-black tabular-nums text-white ${featured ? 'text-[12px]' : 'text-[10px]'}`}
          >
            {discount}%OFF
          </span>
        )}

        {/* 期限バッジ */}
        {dateEnd && (
          <span
            className={`absolute left-1 rounded bg-amber-500/90 px-1.5 py-px font-black tabular-nums text-black backdrop-blur-sm ${featured ? 'bottom-14 text-[10px]' : 'bottom-1 text-[9px]'}`}
          >
            ⏰ {formatDeadline(dateEnd)}
          </span>
        )}

        {/* ランクバッジ */}
        {rank !== undefined && (
          <span
            className={`absolute bottom-1 left-1 flex items-center justify-center rounded-full font-black ${
              featured ? 'h-7 w-7 text-[13px]' : 'h-5 w-5 text-[10px]'
            } ${
              rank === 1
                ? 'bg-yellow-400 text-black'
                : rank === 2
                  ? 'bg-white/80 text-black'
                  : rank === 3
                    ? 'bg-orange-400 text-black'
                    : 'bg-black/60 text-white/70'
            }`}
          >
            {rank}
          </span>
        )}

        {/* featured のみ: タイトル・価格をオーバーレイ */}
        {featured && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90">
              {item.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {listPrice !== null && discount !== null && (
                <span className="text-[11px] text-white/35 line-through">
                  ¥{listPrice.toLocaleString('ja-JP')}
                </span>
              )}
              {price !== null && (
                <span
                  className={`text-[13px] font-bold tabular-nums ${discount ? 'text-red-400' : 'text-white/70'}`}
                >
                  ¥{price.toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </div>
        )}
      </a>

      {/* 小カードのみ: テキストを画像の下に表示 */}
      {!featured && (
        <div className="mt-1 flex flex-col gap-0.5 px-0.5">
          <p className="line-clamp-2 text-[10px] leading-tight text-white/70">{item.title}</p>
          <div className="flex items-center gap-1">
            {listPrice !== null && discount !== null && (
              <span className="text-[9px] text-white/30 line-through">
                ¥{listPrice.toLocaleString('ja-JP')}
              </span>
            )}
            {price !== null && (
              <span
                className={`text-[10px] font-bold tabular-nums ${discount ? 'text-red-400' : 'text-white/55'}`}
              >
                ¥{price.toLocaleString('ja-JP')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
