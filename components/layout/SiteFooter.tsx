'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

// BottomNav と同じく、年齢ゲート・認証画面では出さない
const NO_FOOTER_PREFIXES = ['/age-check', '/login', '/auth', '/register', '/welcome']

type LinkDef = { href: string; label: string }

const COLUMNS: Array<{ title: string; links: LinkDef[] }> = [
  {
    title: '探す',
    links: [
      { href: '/', label: 'ホーム' },
      { href: '/sale', label: '今日のセール' },
      { href: '/ranking', label: 'ランキング' },
      { href: '/discover', label: 'スワイプで探す' },
    ],
  },
  {
    title: 'カテゴリ',
    links: [
      { href: '/actress', label: '女優から探す' },
      { href: '/series', label: 'シリーズ' },
      { href: '/search', label: 'キーワード検索' },
      { href: '/favorites', label: 'お気に入り' },
    ],
  },
  {
    title: '使い方',
    links: [
      { href: '/guide', label: 'はじめてガイド' },
      { href: '/pwa', label: 'アプリとして使う' },
      { href: '/mypage', label: 'マイページ' },
    ],
  },
]

/**
 * 全ページ共通フッター（追加20）。
 * 主要ページへの内部リンクを集約し、クローラビリティと回遊を底上げする。
 * DmmCredit の直前に置かれ、ボトムナビ分の余白は DmmCredit 側が確保する。
 */
export function SiteFooter() {
  const pathname = usePathname()
  if (NO_FOOTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <footer className="mt-10 border-t border-white/8 px-5 pt-7">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-x-4 gap-y-6">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2.5">
            <p
              className="text-[10px] font-semibold tracking-[0.2em] text-white/45"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {col.title}
            </p>
            {col.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[12px] leading-snug text-white/60 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-7 w-full max-w-3xl">
        <p className="text-[14px] font-black tracking-tight text-white/80">FANZAピックス</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          FANZAのセール・ランキング・推し女優をアプリ感覚でチェック。掲載リンクには広告（PR）を含みます。
          18歳未満の方はご利用いただけません。
        </p>
        <div className="mt-3">
          <TelegramJoinCard placement="footer" variant="footer" />
        </div>
      </div>
    </footer>
  )
}
