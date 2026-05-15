import type { DmmItem } from '@/types/dmm'
import type { FavoriteItem } from '@/actions/favorites'
import type { GuestFavItem } from '@/lib/guest-favorites'
import { parsePrice } from '@/lib/ranking'

export function dmmItemToFavorite(item: DmmItem): FavoriteItem {
  return {
    item_id: item.content_id,
    item_title: item.title,
    item_url: item.affiliateURL,
    image_url: item.imageURL.list ?? item.imageURL.large ?? null,
    price: parsePrice(item.prices.price),
  }
}

export function dmmItemToGuestFav(item: DmmItem): GuestFavItem {
  return {
    item_id: item.content_id,
    title: item.title,
    affiliate_url: item.affiliateURL,
    image_url: item.imageURL.list ?? item.imageURL.large ?? null,
    price: parsePrice(item.prices.price),
    list_price: parsePrice(item.prices.list_price),
  }
}
