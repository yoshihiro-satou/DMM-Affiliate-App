'use client'

import { useState, useTransition } from 'react'
import { Bell, Flame, Star } from 'lucide-react'
import { updateNotificationType, type NotificationType } from '@/actions/push'

const OPTIONS: Array<{ type: NotificationType; label: string; icon: typeof Bell }> = [
  { type: 'oshi', label: '推し', icon: Star },
  { type: 'sale', label: 'セール', icon: Flame },
  { type: 'both', label: '両方', icon: Bell },
]

/**
 * 通知種別をあとから変更するトグル（追加15）。
 * 購読済みユーザーが「全部オフ」せずにセール/推しを個別に切り替えられるようにする。
 * 購読が無い場合（initialType=null）は何も表示しない。
 */
export function NotifyTypeToggle({ initialType }: { initialType: NotificationType | null }) {
  const [type, setType] = useState<NotificationType | null>(initialType)
  const [isPending, startTransition] = useTransition()

  if (initialType === null) return null

  function choose(next: NotificationType) {
    if (next === type || isPending) return
    const prev = type
    setType(next) // オプティミスティック
    startTransition(async () => {
      const res = await updateNotificationType(next)
      if (!res.ok) setType(prev) // 失敗時ロールバック
    })
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
      <p
        className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/55"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        受け取る通知の種類
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = type === opt.type
          return (
            <button
              key={opt.type}
              onClick={() => choose(opt.type)}
              disabled={isPending}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors disabled:opacity-60 ${
                active
                  ? 'border-red-600/40 bg-red-600/10 text-red-400'
                  : 'border-white/8 bg-white/3 text-white/55 hover:border-white/15'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon size={16} />
              <span className="text-[11px] font-bold">{opt.label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-white/40">
        いつでも変更できます。通知を完全に止めたいときは上の「通知オン」をタップして解除してください。
      </p>
    </div>
  )
}
