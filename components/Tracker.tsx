'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { track, captureRef, getSessionId } from '@/lib/track'
import { trackEvent } from '@/lib/analytics'

const VISIT_SESSION_KEY = 'fp_visited' // セッション内 visit 重複防止
const LAST_VISIT_KEY = 'fp_last_visit' // 日次 revisit 判定
const CHECKIN_KEY = 'fp_checkin' // 日次ログインストリーク更新の重複防止
const AGE_GATE_SEEN_KEY = 'fp_age_gate_seen' // 年齢ゲートを見た（突破検出の前提）
const AGE_PASSED_KEY = 'fp_age_passed' // 年齢ゲート突破 age_pass の二重送信防止

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * DMMアフィリURL（?lurl=<encoded target>&af_id=...）から content id(cid) を復元する。
 * CTAに data-item-id が無くても「どの作品が送客したか」を events.item_id に残せる保険。
 */
function itemIdFromHref(href: string): string | null {
  try {
    const u = new URL(href)
    const lurl = u.searchParams.get('lurl')
    const target = lurl ? decodeURIComponent(lurl) : href
    return target.match(/cid=([^/&?]+)/)?.[1] ?? null
  } catch {
    return null
  }
}

/** アフィリクリックの発生面をパスから粗く分類（GA4 cta_position 用）。 */
function ctaPositionFromPath(path: string): string {
  if (path.startsWith('/item')) return 'item'
  if (path.startsWith('/toys')) return 'toys'
  if (path.startsWith('/sale')) return 'sale'
  if (path.startsWith('/ranking')) return 'ranking'
  if (path.startsWith('/actress')) return 'actress'
  if (path.startsWith('/series')) return 'series'
  if (path.startsWith('/genre')) return 'genre'
  if (path === '/') return 'home'
  return 'other'
}

/**
 * 自前KPI計測のクライアント側エントリ（追加12）。
 * - 流入元(ref)の補足、visit / revisit の記録
 * - PWAインストール・アフィリンククリックの記録
 * - ログイン中ユーザーの日次チェックイン（ストリーク更新 → STREAKバッジ起動・追加14）
 */
export function Tracker() {
  const { isLoggedIn } = useAuth()
  const pathname = usePathname()

  // 訪問計測（マウント時1回）
  useEffect(() => {
    captureRef()
    getSessionId()

    // 年齢ゲート画面(/age-check)は「サイト内に入る前」なので visit/revisit を計上しない。
    // ここで計上すると、ゲートで離脱した人や bot まで訪問にカウントされ、ファネル上段
    // （visit/UU → age_pass）の分母が膨らんで歩留まりが読めなくなる。ref/session の
    // 補足は跨ぎ計測のため継続する。突破後の本来ページで visit が1回だけ立つ。
    const isAgeGate = pathname === '/age-check'

    try {
      if (isAgeGate) {
        // ゲート画面を見たことを記録（突破検出の前提）。sessionStorage はゲート突破時の
        // フルリロード（server action redirect）を跨いで残る。
        sessionStorage.setItem(AGE_GATE_SEEN_KEY, '1')
      } else {
        // 年齢ゲート突破（GA4 age_pass）：ゲートを見たセッションで、突破後の本来ページに
        // 到達した最初の1回だけ。本家の積年の謎「到達は出たが収益0」を分解するファネル
        // 上段（visit → age_pass → affiliate_click）。GA4管理画面で「キーイベント」化する。
        if (
          sessionStorage.getItem(AGE_GATE_SEEN_KEY) === '1' &&
          !sessionStorage.getItem(AGE_PASSED_KEY)
        ) {
          trackEvent('age_pass')
          sessionStorage.setItem(AGE_PASSED_KEY, '1')
        }
        // visit はセッションにつき1回
        if (!sessionStorage.getItem(VISIT_SESSION_KEY)) {
          track('visit')
          sessionStorage.setItem(VISIT_SESSION_KEY, '1')
        }
        // revisit は「前回訪問日 < 今日」のとき1回
        const last = localStorage.getItem(LAST_VISIT_KEY)
        const t = today()
        if (last && last < t) track('revisit')
        localStorage.setItem(LAST_VISIT_KEY, t)
      }
    } catch {
      // localStorage 不可環境は無視
    }

    // PWAインストール完了
    const onInstalled = () => track('pwa_install')
    window.addEventListener('appinstalled', onInstalled)

    // アフィリンククリック（委譲リスナー：DMM/FANZA 外部リンク）
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (/al\.dmm|al\.fanza|dmm\.co\.jp|fanza\.co\.jp/.test(href)) {
        const itemId = anchor.dataset.itemId ?? itemIdFromHref(href)
        // CTA位置：明示タグ data-cta を優先、無ければ現在パスから推定（どの面が送客したか）。
        const ctaEl = anchor.closest('[data-cta]') as HTMLElement | null
        const ctaPosition = ctaEl?.dataset.cta ?? ctaPositionFromPath(window.location.pathname)
        // 自前KPI（Supabase events）
        track('affiliate_click', { itemId, meta: { ctaPosition } })
        // GA4 キーイベント（FANZA送客＝本サイト最重要のコンバージョン）。
        // GA4管理画面で `affiliate_click` を「キーイベント」に指定して計上する。
        trackEvent('affiliate_click', { item_id: itemId, link_url: href, cta_position: ctaPosition })
      }
    }
    document.addEventListener('click', onClick, { capture: true })

    return () => {
      window.removeEventListener('appinstalled', onInstalled)
      document.removeEventListener('click', onClick, { capture: true })
    }
    // マウント時の pathname のみ参照する意図（再ナビゲーションでの再実行は不要）。
    // ゲート(/age-check)→突破は server action redirect の全再読込で Tracker が再マウント
    // されるため、突破後ページの pathname で visit が正しく1回立つ。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 日次チェックイン（ログイン中・1日1回）→ ストリーク更新でSTREAKバッジを起動
  useEffect(() => {
    if (!isLoggedIn) return
    try {
      if (localStorage.getItem(CHECKIN_KEY) === today()) return
    } catch {
      // 続行
    }
    void fetch('/api/daily-checkin', { method: 'POST', keepalive: true })
      .then(() => {
        try {
          localStorage.setItem(CHECKIN_KEY, today())
        } catch {}
      })
      .catch(() => {})
  }, [isLoggedIn])

  return null
}
