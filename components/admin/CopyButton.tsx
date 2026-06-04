'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * クリップボードへコピーするボタン（管理画面用）。
 * X手動投稿ジェネレータで投稿文を「貼るだけ」にする。
 */
export function CopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // クリップボード非対応環境では無視（手動選択にフォールバック）
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors ${
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-white/15 bg-white/5 text-white/75 hover:border-white/30'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'コピーしました' : label}
    </button>
  )
}
