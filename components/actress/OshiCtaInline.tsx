'use client'

import { useState, useTransition } from 'react'
import { Star, Check } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { setOshiActress } from '@/app/mypage/actions'

type Props = {
  actressId: string
  actressName: string
}

/**
 * 女優ページのヒーロー直下に置く「推しに設定 → 新作通知」CTA（施策3）。
 * ゲストは登録導線へ、ログイン済みはワンタップで推し登録。
 */
export function OshiCtaInline({ actressId, actressName }: Props) {
  const { isLoggedIn } = useAuth()
  const [done, setDone] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!isLoggedIn) {
      setShowPrompt(true)
      return
    }
    startTransition(async () => {
      await setOshiActress(actressId, actressName)
      setDone(true)
    })
  }

  return (
    <>
      <div className="px-4 py-2">
        <button
          onClick={handleClick}
          disabled={isPending || done}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-bold transition-colors disabled:opacity-100 ${
            done
              ? 'border-red-600/40 bg-red-600/10 text-red-400'
              : 'border-red-700/50 bg-red-600/5 text-red-400 hover:border-red-500 active:opacity-80'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {done ? (
            <>
              <Check size={16} />
              推しに設定しました（新作を通知）
            </>
          ) : (
            <>
              <Star size={16} />
              {actressName}を推しに設定して新作を通知
            </>
          )}
        </button>
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
