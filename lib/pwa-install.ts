'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallState = {
  /** Android/Chrome 等でインストールプロンプトを出せる */
  canInstall: boolean
  /** iOS Safari（プロンプト非対応 → 手順案内が必要） */
  isIOS: boolean
  /** 既に PWA として起動中（インストール済み） */
  isStandalone: boolean
  /** インストールプロンプトを表示。accepted なら true */
  promptInstall: () => Promise<boolean>
}

// SSR では false を返し、クライアントで実値に切り替える（ハイドレーション不一致を回避）
const noopSubscribe = () => () => {}

function useIsIOS(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const ua = navigator.userAgent
      return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
    },
    () => false
  )
}

function useIsStandalone(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false
  )
}

/**
 * PWA インストールの状態とプロンプト起動を提供する（施策3）。
 * beforeinstallprompt を捕捉して保持し、任意のタイミングで prompt() を呼べるようにする。
 */
export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const isIOS = useIsIOS()
  const isStandalone = useIsStandalone()

  useEffect(() => {
    // setState はイベントコールバック内でのみ呼ぶ（effect 本体では呼ばない）
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)

    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function promptInstall(): Promise<boolean> {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome === 'accepted'
  }

  return { canInstall: !!deferred, isIOS, isStandalone, promptInstall }
}
