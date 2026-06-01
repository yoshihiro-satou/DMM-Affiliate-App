'use client'

import { useEffect, useState } from 'react'
import { Bell, Flame, Star } from 'lucide-react'
import type { NotificationType } from '@/actions/push'

type Props = {
  onChoose: (type: NotificationType) => void
  onClose: () => void
}

const OPTIONS: Array<{
  type: NotificationType
  label: string
  desc: string
  icon: typeof Bell
}> = [
  {
    type: 'sale',
    label: 'セール速報',
    desc: '毎日深夜に始まる最大90%OFFセールをいち早く通知',
    icon: Flame,
  },
  {
    type: 'oshi',
    label: '推し女優の新作',
    desc: '登録した推し女優の新作・特売が出たら通知',
    icon: Star,
  },
  {
    type: 'both',
    label: '両方受け取る',
    desc: 'セール速報と推しの新作、どちらも見逃さない',
    icon: Bell,
  },
]

/**
 * 通知購読時の種別選択シート（施策9）。
 * 値提示＋登録者の実数（ソーシャルプルーフ）を見せてから許可へ進ませる。
 */
export function NotifyChoiceSheet({ onChoose, onClose }: Props) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/subscriber-count')
      .then((r) => r.json())
      .then((d: { count?: number }) => {
        if (alive) setCount(typeof d.count === 'number' ? d.count : null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-6 pb-10 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        <h2 className="text-lg font-bold text-white">通知を受け取る</h2>
        {count !== null && count > 0 ? (
          <p className="mt-1 text-[12px] text-white/55">
            現在{' '}
            <span className="font-bold text-red-400 tabular-nums">{count}</span> 人が登録中
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-white/55">受け取る通知を選んでください</p>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.type}
                onClick={() => onChoose(opt.type)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3.5 text-left transition-colors hover:border-red-600/40 hover:bg-red-600/5"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600/12 text-red-400">
                  <Icon size={18} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[14px] font-bold text-white">{opt.label}</span>
                  <span className="text-[11px] leading-snug text-white/55">{opt.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-3 flex h-10 w-full items-center justify-center text-[13px] text-white/65"
        >
          あとで
        </button>
      </div>
    </>
  )
}
