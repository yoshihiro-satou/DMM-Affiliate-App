import { migrateGuestData } from '@/app/login/actions'
import { getGuestFavoriteIds, getGuestFavorites } from '@/lib/guest-favorites'
import { getGuestSwipes, clearGuestSwipes } from '@/lib/guest-swipes'

export async function runGuestMigration() {
  try {
    const favorites = getGuestFavoriteIds()
    const favoritesMeta = getGuestFavorites()
    const swipes = getGuestSwipes()

    if (favorites.length === 0 && swipes.length === 0) return

    await migrateGuestData({ favorites, favoritesMeta, swipes })

    localStorage.removeItem('guest_favorites')
    localStorage.removeItem('guest_favorites_data')
    clearGuestSwipes()
  } catch {
    // 移行失敗は非クリティカル — サイレントに無視
  }
}
