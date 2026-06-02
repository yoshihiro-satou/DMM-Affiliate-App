'use client'

import { useState, useEffect, useTransition } from 'react'
import { saveSubscription, removeSubscription, type NotificationType } from '@/actions/push'
import { track } from '@/lib/track'

export type PushState = 'unsupported' | 'loading' | 'denied' | 'unsubscribed' | 'subscribed'

/**
 * Web Push の購読状態管理と購読/解除処理を共有するフック。
 * PushSubscribeButton（マイページ等）と SaleNotifyNudge（/sale）の両方で使う。
 */
export function usePushSubscribe() {
  const [state, setState] = useState<PushState>(() => {
    if (typeof window === 'undefined') return 'loading'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied'
    return 'loading'
  })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (state !== 'loading') return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'))
    // 初回マウント時に既存購読を検出する（state は初期判定のみに使用）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function subscribeWithType(notificationType: NotificationType) {
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[usePushSubscribe] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      const json = sub.toJSON()
      if (!json.endpoint) return
      startTransition(async () => {
        await saveSubscription({ endpoint: json.endpoint!, keys: json.keys, notificationType })
        setState('subscribed')
        track('notify_grant', { meta: { type: notificationType } }) // ファネル計測（追加12）
      })
    } catch (err) {
      console.error('[usePushSubscribe] subscribe error:', err)
      setState('unsubscribed')
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) {
      setState('unsubscribed')
      return
    }
    await sub.unsubscribe()
    startTransition(async () => {
      await removeSubscription(sub.endpoint)
      setState('unsubscribed')
    })
  }

  return { state, isPending, subscribeWithType, unsubscribe }
}
