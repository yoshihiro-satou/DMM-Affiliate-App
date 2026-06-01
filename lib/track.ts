'use client'

import type { EventType } from './events'

const SID_KEY = 'fp_sid'
const REF_KEY = 'fp_ref'
const SID_COOKIE = 'fp_sid'
const REF_COOKIE = 'fp_ref'

function setCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; samesite=lax`
}

/** セッションID（端末ごと・永続）。サーバーアクションからも読めるよう Cookie にも保存。 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = ''
  try {
    sid = localStorage.getItem(SID_KEY) ?? ''
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem(SID_KEY, sid)
    }
  } catch {
    sid = sid || crypto.randomUUID()
  }
  setCookie(SID_COOKIE, sid, 60 * 60 * 24 * 365)
  return sid
}

/**
 * 流入元（first-touch）。URLの ?ref= または ?utm_source= を初回のみ保存する。
 * サーバーアクション（age_pass）からも参照できるよう Cookie にも保存。
 */
export function captureRef(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const incoming = params.get('ref') ?? params.get('utm_source')
    const stored = localStorage.getItem(REF_KEY)
    const ref = stored ?? incoming
    if (ref && !stored) {
      localStorage.setItem(REF_KEY, ref)
    }
    if (ref) setCookie(REF_COOKIE, ref, 60 * 60 * 24 * 90)
    return ref
  } catch {
    return null
  }
}

/** イベントを /api/track へ送信（sendBeacon 優先・失敗時 fetch keepalive）。 */
export function track(
  eventType: EventType,
  opts: { itemId?: string | null; meta?: Record<string, unknown> } = {}
): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({
    eventType,
    sessionId: getSessionId(),
    ref: captureRef(),
    itemId: opts.itemId ?? null,
    meta: opts.meta ?? null,
  })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      if (navigator.sendBeacon('/api/track', blob)) return
    }
  } catch {
    // fall through
  }
  void fetch('/api/track', { method: 'POST', body: payload, keepalive: true }).catch(() => {})
}
