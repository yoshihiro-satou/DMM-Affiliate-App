'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, BellRing, Flame, Heart } from 'lucide-react'
import { InstallButton } from '@/components/pwa/InstallButton'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

type Props = {
  isLoggedIn: boolean
  dest: string
}

const VALUE_PROPS = [
  { icon: Sparkles, title: 'スワイプで発見', desc: '気になる作品を直感でサクサク探せる' },
  { icon: BellRing, title: '推しの新作通知', desc: '推し女優の新作が出たらすぐ通知' },
  { icon: Flame, title: 'セール速報', desc: '毎日深夜の最大90%OFFをいち早く' },
  { icon: Heart, title: 'お気に入り保存', desc: '気になる作品をまとめて管理' },
]

function markOnboarded() {
  try {
    document.cookie = `fp_onboarded=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  } catch {
    // 無視
  }
}

export function WelcomeFlow({ isLoggedIn, dest }: Props) {
  const router = useRouter()

  function finish() {
    markOnboarded()
    router.push(dest)
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180,20,20,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-7">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            WELCOME
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FANZAピックスへようこそ
          </h1>
          <p className="text-[13px] leading-6 text-white/65">
            アプリとして使うと、もっと便利になります。
          </p>
        </div>

        {/* 価値提示 */}
        <ul className="flex flex-col gap-2.5">
          {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600/12 text-red-400">
                <Icon size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-[14px] font-bold text-white">{title}</span>
                <span className="text-[11px] leading-snug text-white/55">{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* ① PWA インストール */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-white/45">
            STEP 1 · ホーム画面に追加
          </p>
          <InstallButton />
        </div>

        {/* ② 通知 / 登録 */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-white/45">
            STEP 2 · 通知を受け取る
          </p>
          {isLoggedIn ? (
            <>
              <PushSubscribeButton />
              <Link
                href="/mypage"
                onClick={markOnboarded}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-white/12 text-[13px] font-medium text-white/65 transition-colors hover:border-white/20 hover:text-white"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                推し女優を設定する
              </Link>
            </>
          ) : (
            <>
              {/* ゲストでもセール速報だけは登録不要で購読できる */}
              <PushSubscribeButton />
              <p className="text-[12px] leading-relaxed text-white/55">
                推し女優の新作・お気に入りの値下げ通知は、無料登録で受け取れます。
              </p>
              <Link
                href="/login"
                onClick={markOnboarded}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 text-[15px] font-bold text-white transition-opacity active:opacity-80"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                無料で登録する
              </Link>
            </>
          )}
        </div>

        {/* ②' Telegram（アプリ不要・登録不要で受け取れる別チャネル） */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-white/45">
            または Telegram で受け取る
          </p>
          <TelegramJoinCard placement="welcome" />
        </div>

        {/* スキップ */}
        <button
          onClick={finish}
          className="flex h-11 w-full items-center justify-center text-[13px] text-white/55 transition-colors hover:text-white/75"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          スキップして始める
        </button>
      </div>
    </main>
  )
}
