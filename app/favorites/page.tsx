import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { RemoveFavoriteButton } from './RemoveFavoriteButton'
import { GuestFavoritesList } from './GuestFavoritesList'
import type { Tables } from '@/types/supabase'

export const metadata: Metadata = {
  title: 'お気に入り',
  description: '保存したお気に入り作品の一覧',
}

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <GuestFavoritesList />
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })

  const items = data ?? []

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <h1 className="text-[22px] font-black tracking-tight text-white">お気に入り</h1>
        <p className="mt-0.5 text-[11px] text-white/30">{items.length}件</p>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((fav) => (
            <FavoritedCard key={fav.id} fav={fav} />
          ))}
        </div>
      )}
    </main>
  )
}

function FavoritedCard({ fav }: { fav: Tables<'favorites'> }) {
  const href = fav.item_url ?? '#'

  return (
    <div className="flex flex-col">
      <a
        href={href}
        target={href !== '#' ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-lg bg-white/5"
      >
        {fav.image_url ? (
          <Image
            src={fav.image_url}
            alt={fav.item_title ?? ''}
            width={184}
            height={250}
            className="aspect-[184/250] w-full object-cover"
          />
        ) : (
          <div className="aspect-[184/250] w-full bg-white/5" />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/50 backdrop-blur-sm">
          PR
        </span>
        <RemoveFavoriteButton itemId={fav.item_id} />
      </a>
      <div className="mt-1.5 flex flex-col gap-1">
        {fav.item_title && (
          <p className="line-clamp-2 text-[11px] leading-[1.4] text-white/70">{fav.item_title}</p>
        )}
        {fav.price !== null && (
          <span className="text-[12px] font-bold tabular-nums text-white/60">
            ¥{fav.price.toLocaleString('ja-JP')}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <Heart size={48} className="text-white/10" />
      <div>
        <p className="text-[15px] font-semibold text-white/40">まだお気に入りがありません</p>
        <p className="mt-1 text-[12px] text-white/25">
          作品のハートボタンをタップして保存しましょう
        </p>
      </div>
      <Link
        href="/sale"
        className="mt-2 rounded-xl bg-white/10 px-6 py-2.5 text-[13px] font-semibold text-white/60"
      >
        セール作品を見る
      </Link>
    </div>
  )
}
