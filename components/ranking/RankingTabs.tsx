'use client'

import { useRouter } from 'next/navigation'

export const RANKING_PERIODS = [
  { key: 'daily',   label: '日次'   },
  { key: 'weekly',  label: '週次'   },
  { key: 'monthly', label: '月次'   },
  { key: 'actress', label: '人気女優' },
] as const

export type RankingPeriod = (typeof RANKING_PERIODS)[number]['key']

type Props = {
  currentPeriod: string
}

export function RankingTabs({ currentPeriod }: Props) {
  const router = useRouter()

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
      {RANKING_PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => router.push(`/ranking?period=${key}`)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
            currentPeriod === key
              ? 'bg-red-600 text-white'
              : 'bg-white/8 text-white/50 hover:bg-white/15'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
