'use client'

import { track } from '@/lib/track'
import { TELEGRAM_CHANNEL_URL, TELEGRAM_CHANNEL_WEB_URL } from '@/lib/constants/telegram'

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.94 4.66a1.2 1.2 0 0 0-1.27-.18L3.4 11.2c-.86.34-.83 1.58.04 1.88l4.27 1.45 1.65 5.07c.22.66 1.05.86 1.55.37l2.4-2.33 4.2 3.1c.55.4 1.33.1 1.48-.57l3-13.95c.1-.46-.06-.93-.45-1.23ZM9.7 14.1l8.3-5.1-6.86 6.2c-.16.15-.27.35-.3.57l-.27 2-1.17-3.6 0 0Z" />
    </svg>
  )
}

/**
 * サイト→Telegram「セール速報」チャンネルへの送客CTA（追加11）。
 * 登録不要で受け取れる導線として高インテント面（/sale・/welcome）とフッターに設置する。
 * クリックは track('telegram_click', { placement }) で計測（KPI: 送客効果）。
 *
 * variant:
 *   'card'   ... 強調されたボックス型（/sale・/welcome）
 *   'footer' ... 控えめなインラインリンク（全ページ共通フッター）
 */
export function TelegramJoinCard({
  placement,
  variant = 'card',
}: {
  placement: string
  variant?: 'card' | 'footer'
}) {
  const onClick = () => track('telegram_click', { meta: { placement } })

  if (variant === 'footer') {
    return (
      <a
        href={TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-[12px] text-[#54a9eb] transition-colors hover:text-[#7cc1f0]"
      >
        <TelegramGlyph className="h-3.5 w-3.5" />
        Telegramでセール速報を受け取る
      </a>
    )
  }

  return (
    <div className="rounded-xl border border-[#229ED9]/35 bg-[#229ED9]/10 px-4 py-3">
      <a
        href={TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center gap-3 transition-colors active:opacity-80"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white">
          <TelegramGlyph className="h-5 w-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[14px] font-bold text-white">Telegramでセール速報を先取り</span>
          <span className="text-[11px] leading-snug text-white/55">
            アプリ不要・無料・毎日0時にセール情報が届く
          </span>
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-[#229ED9] px-3 py-1 text-[12px] font-bold text-white">
          参加
        </span>
      </a>
      {/* アプリ未所持でも読めるブラウザ版を併記し離脱を防ぐ */}
      <a
        href={TELEGRAM_CHANNEL_WEB_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('telegram_click', { meta: { placement: `${placement}_web` } })}
        className="mt-2 block text-[11px] text-[#7cc1f0] underline-offset-2 hover:underline"
      >
        アプリを入れずにブラウザで見る →
      </a>
    </div>
  )
}
