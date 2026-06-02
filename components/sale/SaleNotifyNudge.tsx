'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { BellRing, X } from 'lucide-react'
import { usePushSubscribe } from '@/components/push/usePushSubscribe'

const DISMISS_KEY = 'sale_nudge_dismissed_at'
const DISMISS_DAYS = 7
const SCROLL_THRESHOLD = 600
const FALLBACK_MS = 8000

// 最近「閉じた」かを localStorage から読む。SSR との不一致を避けるため
// useSyncExternalStore を使い、サーバーでは true（=非表示）を返す。
function useRecentlyDismissed(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
        return ts > 0 && Date.now() - ts < DISMISS_DAYS * 86_400_000
      } catch {
        return false
      }
    },
    () => true
  )
}

/**
 * セール速報の購読を、/sale を一定スクロール（＝高インテント）した後にだけ
 * 控えめに促すバナー。登録不要（ゲスト可）。
 * すでに購読済み・通知ブロック中・非対応・最近閉じた場合は表示しない。
 */
export function SaleNotifyNudge() {
  const { state, isPending, subscribeWithType } = usePushSubscribe()
  const [engaged, setEngaged] = useState(false)
  const [sessionDismissed, setSessionDismissed] = useState(false)
  const recentlyDismissed = useRecentlyDismissed()

  useEffect(() => {
    if (engaged) return
    const onScroll = () => {
      if (window.scrollY > SCROLL_THRESHOLD) setEngaged(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = setTimeout(() => setEngaged(true), FALLBACK_MS)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [engaged])

  function dismiss() {
    setSessionDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* noop */
    }
  }

  if (state !== 'unsubscribed' || !engaged || sessionDismissed || recentlyDismissed) {
    return null
  }

  return (
    <div
      className="fixed inset-x-0 z-30 px-3"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 8px)' }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-red-500/30 bg-[#1a1014]/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600/15 text-red-400">
          <BellRing size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white">セール速報を受け取る</p>
          <p className="text-[11px] text-white/55">登録不要・最大90%OFFをいち早く通知</p>
        </div>
        <button
          onClick={() => void subscribeWithType('sale')}
          disabled={isPending}
          className="shrink-0 rounded-full bg-red-600 px-3.5 py-1.5 text-[12px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          受け取る
        </button>
        <button
          onClick={dismiss}
          aria-label="閉じる"
          className="shrink-0 text-white/40 active:text-white/70"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
