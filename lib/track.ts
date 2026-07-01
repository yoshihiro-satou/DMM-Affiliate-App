'use client'

import type { EventType } from './events'

const SID_KEY = 'fp_sid'
const REF_KEY = 'fp_ref'
const OVERRIDE_KEY = 'fp_ref_campaign' // last-touch（push通知など）の当該セッション上書き
const SID_COOKIE = 'fp_sid'
const REF_COOKIE = 'fp_ref'

/** push通知クリックなど、first-touch を上書きして当該流入を計測すべき last-touch ref か。 */
function isCampaignRef(ref: string | null): boolean {
  return !!ref && /^push_/.test(ref)
}

/**
 * 明示的な ?ref= / ?utm_source= が無いとき、document.referrer から流入元を粗く分類する。
 * オーガニック検索（Google等）は utm を付けないため、これが無いと ref=null になり
 * 「検索で来た人がアフィリクリックしたか」を funnel_by_ref で帰属できない。first-touch の補助。
 */
function refFromReferrer(): string | null {
  if (typeof document === 'undefined') return null
  try {
    const r = document.referrer
    if (!r) return null // 直接流入 / ブックマーク / PWA起動など（ref無し=direct）
    const host = new URL(r).hostname
    if (host === window.location.hostname) return null // サイト内遷移は流入元ではない
    if (/(^|\.)google\./.test(host)) return 'organic_google'
    if (/(^|\.)bing\./.test(host)) return 'organic_bing'
    if (/(^|\.)yahoo\./.test(host)) return 'organic_yahoo'
    if (/(^|\.)duckduckgo\./.test(host)) return 'organic_ddg'
    if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return 'x'
    return 'referral' // その他の外部サイト経由
  } catch {
    return null
  }
}

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
 * 流入元を解決する（追加12・追加18）。
 * 基本は first-touch（初回の ?ref= / ?utm_source= を永続保存）。ただし push 通知由来の
 * キャンペーン ref（push_sale 等）は再訪ユーザーでも first-touch に埋もれてしまい計測
 * できないため、当該セッションに限り last-touch として上書きする。これにより「通知 →
 * クリック」のコンバージョンを funnel_by_ref で ref 別に集計できる。
 */
export function captureRef(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    // URL → 既存localStorage → Cookie(middlewareが年齢ゲート跨ぎで保持)の順に解決
    const cookieRef = document.cookie.match(/(?:^|;\s*)fp_ref=([^;]+)/)?.[1]
    const incoming =
      params.get('ref') ??
      params.get('utm_source') ??
      (cookieRef ? decodeURIComponent(cookieRef) : null) ??
      refFromReferrer()
    const stored = localStorage.getItem(REF_KEY)

    // first-touch を確定・永続化（push ref で上書きしない）
    const firstTouch = stored ?? incoming
    if (firstTouch && !stored) localStorage.setItem(REF_KEY, firstTouch)
    if (firstTouch) setCookie(REF_COOKIE, firstTouch, 60 * 60 * 24 * 90)

    // push 通知由来はこのセッションの last-touch として優先する
    if (isCampaignRef(incoming)) {
      try { sessionStorage.setItem(OVERRIDE_KEY, incoming!) } catch {}
      return incoming
    }
    let override: string | null = null
    try { override = sessionStorage.getItem(OVERRIDE_KEY) } catch {}
    return override ?? firstTouch
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
