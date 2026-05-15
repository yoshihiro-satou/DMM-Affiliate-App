'use client'

import { ShoppingCart, ExternalLink } from 'lucide-react'

type Props = {
  urls: string[]
  label: string
  variant: 'primary' | 'secondary'
}

export function BulkBuyButton({ urls, label, variant }: Props) {
  function openAll() {
    // ブラウザのポップアップブロック対策: 最大10件まで
    urls.slice(0, 10).forEach((url) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  if (urls.length === 0) return null

  return (
    <button
      onClick={openAll}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
        variant === 'primary'
          ? 'bg-red-600 text-white hover:bg-red-500'
          : 'bg-white/8 text-white/60 hover:bg-white/15'
      }`}
    >
      {variant === 'primary' ? <ShoppingCart size={13} /> : <ExternalLink size={13} />}
      {label}
    </button>
  )
}
