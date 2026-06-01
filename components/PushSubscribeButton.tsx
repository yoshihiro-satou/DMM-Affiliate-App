'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { saveSubscription, removeSubscription } from '@/actions/push'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { useAuth } from '@/components/providers/auth-provider'
import { track } from '@/lib/track'

type State = 'unsupported' | 'loading' | 'denied' | 'unsubscribed' | 'subscribed'

export function PushSubscribeButton() {
  const { isLoggedIn } = useAuth()
  const [state, setState] = useState<State>(() => {
    if (typeof window === 'undefined') return 'loading'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied'
    return 'loading'
  })
  const [showPrompt, setShowPrompt] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (state !== 'loading') return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function subscribe() {
    if (!isLoggedIn) { setShowPrompt(true); return }

    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[PushSubscribeButton] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      const json = sub.toJSON()
      if (!json.endpoint) return
      startTransition(async () => {
        await saveSubscription({ endpoint: json.endpoint!, keys: json.keys })
        setState('subscribed')
        track('notify_grant') // ファネル計測: 通知許可（追加12）
      })
    } catch (err) {
      console.error('[PushSubscribeButton] subscribe error:', err)
      setState('unsubscribed')
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) { setState('unsubscribed'); return }
    await sub.unsubscribe()
    startTransition(async () => {
      await removeSubscription(sub.endpoint)
      setState('unsubscribed')
    })
  }

  function handleClick() {
    if (state === 'subscribed') unsubscribe()
    else if (state === 'unsubscribed') subscribe()
  }

  if (state === 'unsupported') return null

  const isDisabled = state === 'loading' || state === 'denied' || isPending

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`flex w-full items-center justify-between rounded-lg border px-5 py-4 transition-colors disabled:opacity-40 ${
          state === 'subscribed'
            ? 'border-red-600/40 bg-red-600/10 text-red-400'
            : 'border-white/8 bg-white/3 text-white/60 hover:border-white/15'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex flex-col items-start">
          <span
            className="text-[10px] font-semibold tracking-[0.2em] text-white/55"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            PUSH NOTIFICATION
          </span>
          <span className="mt-0.5 text-[14px] font-bold text-white">
            {state === 'subscribed'
              ? '通知オン'
              : state === 'denied'
                ? '通知がブロックされています'
                : '値下げ・新着通知を受け取る'}
          </span>
          {state === 'denied' && (
            <span className="mt-0.5 text-[10px] text-white/55">
              ブラウザの設定から通知を許可してください
            </span>
          )}
        </div>
        {state === 'subscribed' ? (
          <BellOff size={20} className="text-red-400" />
        ) : state === 'denied' ? (
          <Bell size={20} className="text-white/40" />
        ) : (
          <BellRing size={20} className="text-white/65" />
        )}
      </button>

      {showPrompt && (
        <LoginPromptSheet
          title="通知を受け取るには登録が必要です"
          body="無料登録するとお気に入り作品の値下げ・新着・シリーズ新刊をプッシュ通知でお知らせします。"
          onClose={() => setShowPrompt(false)}
        />
      )}
    </>
  )
}
