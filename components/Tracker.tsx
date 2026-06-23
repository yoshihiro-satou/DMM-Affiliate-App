'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { track, captureRef, getSessionId } from '@/lib/track'
import { trackEvent } from '@/lib/analytics'

const VISIT_SESSION_KEY = 'fp_visited' // セッション内 visit 重複防止
const LAST_VISIT_KEY = 'fp_last_visit' // 日次 revisit 判定
const CHECKIN_KEY = 'fp_checkin' // 日次ログインストリーク更新の重複防止

function today(): string {
  return new Date().toISOString().slice(0, 10)
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
      // visit はセッションにつき1回（ゲート画面では計上しない）
      if (!isAgeGate && !sessionStorage.getItem(VISIT_SESSION_KEY)) {
        track('visit')
        sessionStorage.setItem(VISIT_SESSION_KEY, '1')
      }
      // revisit は「前回訪問日 < 今日」のとき1回（ゲート画面では計上しない）
      if (!isAgeGate) {
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
        const itemId = anchor.dataset.itemId ?? null
        // 自前KPI（Supabase events）
        track('affiliate_click', { itemId })
        // GA4 キーイベント（FANZA送客＝本サイト最重要のコンバージョン）。
        // GA4管理画面で `affiliate_click` を「キーイベント」に指定して計上する。
        trackEvent('affiliate_click', { item_id: itemId, link_url: href })
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
