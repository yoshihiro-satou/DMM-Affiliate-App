const IDS_KEY = 'guest_favorites'
const DATA_KEY = 'guest_favorites_data'
export const GUEST_LIMIT = 5

export type GuestFavItem = {
  item_id: string
  title: string
  affiliate_url: string
  image_url: string | null
  price: number | null
  list_price: number | null
}

function readIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(IDS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function readData(): GuestFavItem[] {
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getGuestFavoriteIds(): string[] {
  return readIds()
}

export function getGuestFavorites(): GuestFavItem[] {
  return readData()
}

export function isGuestFavorited(itemId: string): boolean {
  return readIds().includes(itemId)
}

export function addGuestFavorite(item: GuestFavItem): { limitReached: boolean } {
  const ids = readIds()
  if (ids.includes(item.item_id)) return { limitReached: false }
  if (ids.length >= GUEST_LIMIT) return { limitReached: true }
  localStorage.setItem(IDS_KEY, JSON.stringify([...ids, item.item_id]))
  localStorage.setItem(DATA_KEY, JSON.stringify([...readData(), item]))
  return { limitReached: false }
}

export function removeGuestFavorite(itemId: string): void {
  localStorage.setItem(IDS_KEY, JSON.stringify(readIds().filter((id) => id !== itemId)))
  localStorage.setItem(DATA_KEY, JSON.stringify(readData().filter((d) => d.item_id !== itemId)))
}
