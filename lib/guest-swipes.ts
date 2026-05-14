const KEY = 'guest_swipe_history'

export type GuestSwipe = {
  item_id: string
  direction: 'like' | 'skip'
  created_at: string
}

function read(): GuestSwipe[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getGuestSwipes(): GuestSwipe[] {
  return read()
}

export function addGuestSwipe(itemId: string, direction: 'like' | 'skip'): void {
  const history = read()
  history.push({ item_id: itemId, direction, created_at: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(history))
}

export function clearGuestSwipes(): void {
  localStorage.removeItem(KEY)
}
