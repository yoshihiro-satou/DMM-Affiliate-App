'use client'

import { useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import type { NotificationType } from '@/actions/push'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { NotifyChoiceSheet } from '@/components/ui/NotifyChoiceSheet'
import { useAuth } from '@/components/providers/auth-provider'
import { usePushSubscribe } from '@/components/push/usePushSubscribe'

export function PushSubscribeButton() {
  const { isLoggedIn } = useAuth()
  const { state, isPending, subscribeWithType, unsubscribe } = usePushSubscribe()
  const [showPrompt, setShowPrompt] = useState(false)
  const [showChoice, setShowChoice] = useState(false)

  // ステップ1: 種別選択シートを開く（事前の価値提示で許可率を上げる）。
  // ゲストでも開く。シート内でセール速報のみ選択可（推し/両方は登録誘導）。
  function startSubscribe() {
    setShowChoice(true)
  }

  // ステップ2: 種別決定 → ブラウザの許可プロンプト → 購読保存
  function handleChoose(notificationType: NotificationType) {
    setShowChoice(false)
    void subscribeWithType(notificationType)
  }

  function handleClick() {
    if (state === 'subscribed') unsubscribe()
    else if (state === 'unsubscribed') startSubscribe()
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

      {showChoice && (
        <NotifyChoiceSheet
          onChoose={handleChoose}
          onClose={() => setShowChoice(false)}
          isLoggedIn={isLoggedIn}
          onRequireLogin={() => {
            setShowChoice(false)
            setShowPrompt(true)
          }}
        />
      )}

      {showPrompt && (
        <LoginPromptSheet
          title="推しの新作通知は登録で受け取れます"
          body="無料登録すると推し女優の新作・お気に入りの値下げ・シリーズ新刊もプッシュ通知でお知らせします。セール速報は登録なしでもOKです。"
          onClose={() => setShowPrompt(false)}
        />
      )}
    </>
  )
}
