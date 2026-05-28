export const GA_ID = 'G-X8VN2V321X'

type GtagFn = (...args: unknown[]) => void

function gtag(...args: unknown[]) {
  const w = window as typeof window & { gtag?: GtagFn }
  w.gtag?.(...args)
}

export function setGaUserId(userId: string | null) {
  if (typeof window === 'undefined') return
  if (userId) {
    gtag('config', GA_ID, { user_id: userId })
  } else {
    gtag('set', { user_id: null })
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  gtag('event', name, params)
}
