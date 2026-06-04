'use client'

import { Share2 } from 'lucide-react'
import { track } from '@/lib/track'
import { TELEGRAM_CHANNEL_URL } from '@/lib/constants/telegram'

const SHARE_TEXT = 'FANZAのセール速報・新作情報が毎日届くチャンネル📢'
const SHARE_URL = `https://t.me/share/url?url=${encodeURIComponent(
  TELEGRAM_CHANNEL_URL
)}&text=${encodeURIComponent(SHARE_TEXT)}`

/**
 * Telegram チャンネルを友だちへ拡散してもらう共有ボタン（追加11・集客導線）。
 * t.me/share/url で Telegram の共有ダイアログを開き、購読者自身に広めてもらう。
 * クリックは track('telegram_click', { placement }) で計測。
 */
export function TelegramShareButton({ placement = 'share' }: { placement?: string }) {
  return (
    <a
      href={SHARE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('telegram_click', { meta: { placement } })}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 px-4 py-3 text-[13px] font-bold text-[#7cc1f0] transition-colors hover:bg-[#229ED9]/15"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Share2 size={16} />
      友だちにこのチャンネルを教える
    </a>
  )
}
