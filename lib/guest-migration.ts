import { migrateGuestData } from '@/app/login/actions'

export async function runGuestMigration() {
  try {
    const rawFavs = localStorage.getItem('guest_favorites')
    const rawSwipes = localStorage.getItem('guest_swipe_history')

    const favorites: string[] = rawFavs ? JSON.parse(rawFavs) : []
    const swipes: Array<{ item_id: string; direction: 'like' | 'skip'; created_at: string }> =
      rawSwipes ? JSON.parse(rawSwipes) : []

    if (favorites.length === 0 && swipes.length === 0) return

    await migrateGuestData({ favorites, swipes })

    localStorage.removeItem('guest_favorites')
    localStorage.removeItem('guest_swipe_history')
  } catch {
    // 移行失敗は非クリティカル — サイレントに無視
  }
}
