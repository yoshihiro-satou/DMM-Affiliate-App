import type { DmmItem } from '@/types/dmm'
import type { FavoriteItem } from '@/actions/favorites'
import type { GuestFavItem } from '@/lib/guest-favorites'
import { parsePrice } from '@/lib/ranking'
import { toLargeDmmImageUrl } from '@/lib/dmm/image'

// 一覧で引き伸ばしても荒くならないよう、大サイズ（pl.jpg）を保存する。
// large が無ければ small/list を大サイズへ正規化してから保存。
function favoriteImageUrl(item: DmmItem): string | null {
  return toLargeDmmImageUrl(
    item.imageURL.large ?? item.imageURL.small ?? item.imageURL.list ?? null
  )
}

export function dmmItemToFavorite(item: DmmItem): FavoriteItem {
  return {
    item_id: item.content_id,
    item_title: item.title,
    item_url: item.affiliateURL,
    image_url: favoriteImageUrl(item),
    price: parsePrice(item.prices.price),
    list_price: parsePrice(item.prices.list_price),
  }
}

export function dmmItemToGuestFav(item: DmmItem): GuestFavItem {
  return {
    item_id: item.content_id,
    title: item.title,
    affiliate_url: item.affiliateURL,
    image_url: favoriteImageUrl(item),
    price: parsePrice(item.prices.price),
    list_price: parsePrice(item.prices.list_price),
  }
}
