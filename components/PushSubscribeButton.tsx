'use client'

import { useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import type { NotificationType } from '@/actions/push'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { NotifyChoiceSheet } from '@/components/ui/NotifyChoiceSheet'
import { useAuth } from '@/components/providers/auth-provider'
import { usePushSubscribe } from '@/components/push/usePushSubscribe'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

/**
 * @param telegramFallback Push非対応/拒否のときに Telegram 代替を出すか（既定 true）。
 *   ページ側で別途 TelegramJoinCard を常設している場合は false にして二重表示を防ぐ。
 *   iOS Safari（非PWA）は Web Push 不可なので、ここで取りこぼしを Telegram へ逃がす。
 */
export function PushSubscribeButton({ telegramFallback = true }: { telegramFallback?: boolean }) {
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

  // iOS Safari（非PWA）など Web Push 非対応端末: Telegram を代替提示して取りこぼしを回収
  if (state === 'unsupported') {
    if (!telegramFallback) return null
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] leading-relaxed text-white/55">
          お使いの環境はプッシュ通知に非対応です。Telegramでセール速報を受け取れます。
        </p>
        <TelegramJoinCard placement="push_fallback_ios" />
      </div>
    )
  }

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

      {/* 通知ブロック中も Telegram なら受け取れる代替導線 */}
      {state === 'denied' && telegramFallback && <TelegramJoinCard placement="push_fallback_denied" />}

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
