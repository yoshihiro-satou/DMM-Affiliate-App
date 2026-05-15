import Image from 'next/image'
import Link from 'next/link'
import type { DmmActress } from '@/types/dmm'

type Props = {
  actress: DmmActress
}

export function ActressCard({ actress }: Props) {
  const imageUrl = actress.imageURL?.large ?? actress.imageURL?.small ?? null
  const stats = [
    actress.bust ? `B${actress.bust}` : null,
    actress.waist ? `W${actress.waist}` : null,
    actress.hip ? `H${actress.hip}` : null,
    actress.height ? `${actress.height}cm` : null,
  ].filter(Boolean)

  return (
    <Link href={`/actress/${actress.id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={actress.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/10 text-4xl">
            ?
          </div>
        )}
      </div>
      <div className="px-0.5">
        <p className="line-clamp-1 text-[13px] font-medium text-white/90">{actress.name}</p>
        {stats.length > 0 && (
          <p className="mt-0.5 text-[10px] text-white/35">{stats.join(' / ')}</p>
        )}
      </div>
    </Link>
  )
}
