'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { track, captureRef, getSessionId } from '@/lib/track'

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

  // 訪問計測（マウント時1回）
  useEffect(() => {
    captureRef()
    getSessionId()

    try {
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
        track('affiliate_click', { itemId })
      }
    }
    document.addEventListener('click', onClick, { capture: true })

    return () => {
      window.removeEventListener('appinstalled', onInstalled)
      document.removeEventListener('click', onClick, { capture: true })
    }
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
