import Image from 'next/image'
import Link from 'next/link'
import type { DmmActress } from '@/types/dmm'

type Props = {
  actress: DmmActress
}

export function ActressCard({ actress }: Props) {
  const imageUrl = actress.imageURL?.large ?? actress.imageURL?.small ?? null
  const sub = [
    actress.cup    ? `${actress.cup}カップ` : null,
    actress.height ? `${actress.height}cm`  : null,
  ].filter(Boolean).join(' · ')

  return (
    <Link href={`/actress/${actress.id}`} className="group flex flex-col items-center gap-3 text-center">
      {/* 丸型画像（全幅の75%） */}
      <div className="relative aspect-square w-3/4 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={actress.name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 639px) 40vw, (max-width: 1023px) 25vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/10">
            ?
          </div>
        )}
      </div>

      {/* テキスト */}
      <div>
        <p className="line-clamp-1 text-[15px] font-semibold text-white/90">{actress.name}</p>
        {sub && (
          <p className="mt-1 text-[12px] text-white/50">{sub}</p>
        )}
      </div>
    </Link>
  )
}
