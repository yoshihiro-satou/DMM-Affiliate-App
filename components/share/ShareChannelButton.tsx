'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Share2, Send, Link2, Check, MoreHorizontal } from 'lucide-react'
import { track } from '@/lib/track'
import { TELEGRAM_CHANNEL_URL } from '@/lib/constants/telegram'

const SHARE_TEXT = 'FANZAのセール速報・新作情報が毎日届くチャンネル📢'
const SHARE_URL = TELEGRAM_CHANNEL_URL
const enc = encodeURIComponent

// navigator.share の有無をハイドレーション不一致なく読む（サーバーは false 固定）。
const subscribeNoop = () => () => {}
const hasNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

type ShareNetwork = {
  id: string
  label: string
  href: string
  /** ブランドカラー（アイコン円の背景） */
  bg: string
  fg: string
  icon: React.ReactNode
}

// 各SNSの共有ダイアログURL。いずれも同じチャンネルURL＋紹介文を渡す。
const NETWORKS: ShareNetwork[] = [
  {
    id: 'x',
    label: 'X (Twitter)',
    href: `https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SHARE_URL)}`,
    bg: 'bg-black',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'LINE',
    href: `https://line.me/R/msg/text/?${enc(`${SHARE_TEXT}\n${SHARE_URL}`)}`,
    bg: 'bg-[#06C755]',
    fg: 'text-white',
    icon: <span className="text-[10px] font-black tracking-tight">LINE</span>,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`,
    bg: 'bg-[#1877F2]',
    fg: 'text-white',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
      </svg>
    ),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    href: `https://t.me/share/url?url=${enc(SHARE_URL)}&text=${enc(SHARE_TEXT)}`,
    bg: 'bg-[#229ED9]',
    fg: 'text-white',
    icon: <Send size={16} />,
  },
]

/**
 * チャンネルを友だちへ拡散してもらう共有ボタン（集客導線）。
 * クリックでボトムシートを開き、主要SNS（X / LINE / Facebook / Telegram）・
 * リンクコピー・端末のネイティブ共有から選べる。
 * 各選択は track('share_click', { network, placement }) で計測。
 */
export function ShareChannelButton({ placement = 'mypage' }: { placement?: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const canNativeShare = useSyncExternalStore(subscribeNoop, hasNativeShare, () => false)

  // シートを開いている間は背面スクロールを止める
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const close = () => setOpen(false)

  const onPickNetwork = (network: string) => {
    track('share_click', { meta: { network, placement } })
    close()
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopied(true)
      track('share_click', { meta: { network: 'copy', placement } })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボード非対応環境は無視（他の共有手段を使ってもらう）
    }
  }

  const onNativeShare = async () => {
    try {
      await navigator.share({ title: 'FANZAピックス', text: SHARE_TEXT, url: SHARE_URL })
      track('share_click', { meta: { network: 'native', placement } })
      close()
    } catch {
      // ユーザーキャンセル等は無視
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#229ED9]/40 bg-[#229ED9]/10 px-4 py-3 text-[13px] font-bold text-[#7cc1f0] transition-colors hover:bg-[#229ED9]/15"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Share2 size={16} />
        友だちにこのチャンネルを教える
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={close} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-6 pb-10 pt-5">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            <h2 className="text-lg font-bold text-white">友だちに教える</h2>
            <p className="mt-1 text-[12px] text-white/55">
              共有するSNSを選んでください
            </p>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {NETWORKS.map((n) => (
                <a
                  key={n.id}
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onPickNetwork(n.id)}
                  className="flex flex-col items-center gap-1.5"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full ${n.bg} ${n.fg}`}
                  >
                    {n.icon}
                  </span>
                  <span className="text-[10px] leading-tight text-white/65">{n.label}</span>
                </a>
              ))}

              <button
                type="button"
                onClick={onCopy}
                className="flex flex-col items-center gap-1.5"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/80">
                  {copied ? <Check size={18} className="text-green-400" /> : <Link2 size={18} />}
                </span>
                <span className="text-[10px] leading-tight text-white/65">
                  {copied ? 'コピー済み' : 'リンクコピー'}
                </span>
              </button>

              {canNativeShare && (
                <button
                  type="button"
                  onClick={onNativeShare}
                  className="flex flex-col items-center gap-1.5"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/80">
                    <MoreHorizontal size={18} />
                  </span>
                  <span className="text-[10px] leading-tight text-white/65">その他</span>
                </button>
              )}
            </div>

            <button
              onClick={close}
              className="mt-5 flex h-10 w-full items-center justify-center text-[13px] text-white/65"
            >
              閉じる
            </button>
          </div>
        </>
      )}
    </>
  )
}
