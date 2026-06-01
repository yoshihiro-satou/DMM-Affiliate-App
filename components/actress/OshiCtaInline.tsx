'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Check } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { addOshiActress, removeOshiActress } from '@/app/mypage/actions'
import { MAX_OSHI_ACTRESSES } from '@/lib/constants/oshi'

type Props = {
  actressId: string
  actressName: string
  /** この女優が現在のユーザーの推しか（oshi_actresses と同期） */
  initialIsOshi: boolean
  /** 現在の推し登録人数（5人上限判定用） */
  initialOshiCount: number
}

/**
 * 女優ページのヒーロー直下に置く「推しに設定 / 解除」トグルCTA（最大5人）。
 * マイページの推し女優（oshi_actresses）と同期する。
 */
export function OshiCtaInline({ actressId, actressName, initialIsOshi, initialOshiCount }: Props) {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [isOshi, setIsOshi] = useState(initialIsOshi)
  const [count, setCount] = useState(initialOshiCount)
  const [showPrompt, setShowPrompt] = useState(false)
  const [limitMsg, setLimitMsg] = useState(false)
  const [isPending, startTransition] = useTransition()

  function add() {
    if (!isLoggedIn) {
      setShowPrompt(true)
      return
    }
    if (count >= MAX_OSHI_ACTRESSES) {
      setLimitMsg(true)
      return
    }
    setIsOshi(true) // 楽観的更新
    setCount((c) => c + 1)
    startTransition(async () => {
      const res = await addOshiActress(actressId, actressName)
      if (!res.ok) {
        // ロールバック
        setIsOshi(false)
        setCount(res.count)
        if (res.limitReached) setLimitMsg(true)
      }
      router.refresh()
    })
  }

  function remove() {
    setIsOshi(false) // 楽観的更新
    setCount((c) => Math.max(0, c - 1))
    setLimitMsg(false)
    startTransition(async () => {
      await removeOshiActress(actressId)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-col gap-1 px-4 py-2">
        {isOshi ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-[13px] font-bold text-red-400">
              <Check size={16} />
              推しに設定中・新作を通知
            </div>
            <button
              onClick={remove}
              disabled={isPending}
              className="shrink-0 rounded-xl border border-white/12 px-4 py-3 text-[12px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/80 disabled:opacity-60"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              解除
            </button>
          </div>
        ) : (
          <button
            onClick={add}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-700/50 bg-red-600/5 px-4 py-3 text-[13px] font-bold text-red-400 transition-colors hover:border-red-500 active:opacity-80 disabled:opacity-60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Star size={16} />
            {actressName}を推しに設定して新作を通知
          </button>
        )}

        {limitMsg && (
          <p className="text-center text-[11px] text-white/55">
            推し女優は{MAX_OSHI_ACTRESSES}人までです。マイページで入れ替えできます。
          </p>
        )}
      </div>

      {showPrompt && (
        <LoginPromptSheet
          title={`${actressName}を推しに登録しませんか？`}
          body="無料登録すると、推し女優の新作・特売が出たときにプッシュ通知でお知らせします。"
          onClose={() => setShowPrompt(false)}
        />
      )}
    </>
  )
}
