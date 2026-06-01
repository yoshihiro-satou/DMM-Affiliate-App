'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Check } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { setOshiActress, clearOshiActress } from '@/app/mypage/actions'

type Props = {
  actressId: string
  actressName: string
  /** この女優が現在のユーザーの推しか（profiles と同期） */
  initialIsOshi: boolean
}

/**
 * 女優ページのヒーロー直下に置く「推しに設定 / 解除」トグルCTA（施策3）。
 * マイページの推し女優（profiles.oshi_actress_id）と同期する。
 * server action 側で revalidatePath('/mypage') 済みのためマイページにも反映される。
 */
export function OshiCtaInline({ actressId, actressName, initialIsOshi }: Props) {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [isOshi, setIsOshi] = useState(initialIsOshi)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isPending, startTransition] = useTransition()

  function setOshi() {
    if (!isLoggedIn) {
      setShowPrompt(true)
      return
    }
    setIsOshi(true) // 楽観的更新
    startTransition(async () => {
      await setOshiActress(actressId, actressName)
      router.refresh()
    })
  }

  function clearOshi() {
    setIsOshi(false) // 楽観的更新
    startTransition(async () => {
      await clearOshiActress()
      router.refresh()
    })
  }

  return (
    <>
      <div className="px-4 py-2">
        {isOshi ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-[13px] font-bold text-red-400">
              <Check size={16} />
              推しに設定中・新作を通知
            </div>
            <button
              onClick={clearOshi}
              disabled={isPending}
              className="shrink-0 rounded-xl border border-white/12 px-4 py-3 text-[12px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/80 disabled:opacity-60"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              解除
            </button>
          </div>
        ) : (
          <button
            onClick={setOshi}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-700/50 bg-red-600/5 px-4 py-3 text-[13px] font-bold text-red-400 transition-colors hover:border-red-500 active:opacity-80 disabled:opacity-60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Star size={16} />
            {actressName}を推しに設定して新作を通知
          </button>
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
