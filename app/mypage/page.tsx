import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from './actions'

export const metadata = {
  title: 'マイページ',
  robots: 'noindex,nofollow',
}

export default async function MyPage() {
  const claims = await getCurrentUser()
  if (!claims) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, points, created_at')
    .eq('id', claims.sub)
    .single()

  const displayName = profile?.display_name ?? 'ゲスト'
  const email = profile?.email ?? (claims.email as string | undefined) ?? ''
  const points = profile?.points ?? 0

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#080808]">
      {/* 背景グラデーション */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-8 px-6 py-12">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            MY PAGE
          </span>
        </div>

        {/* プロフィール */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* アバタープレースホルダー */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-black text-white/60">
            {displayName.charAt(0)}
          </div>
          <div>
            <p
              className="text-2xl font-black tracking-tight text-white"
              style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", Georgia, serif' }}
            >
              {displayName}
            </p>
            <p className="mt-1 text-[12px] text-white/30">{email}</p>
          </div>
        </div>

        {/* 区切り */}
        <div className="h-px w-full bg-white/8" />

        {/* ポイント */}
        <div className="rounded-lg border border-white/8 bg-white/3 p-5">
          <p
            className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-white/30"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            POINTS
          </p>
          <p className="text-3xl font-black tabular-nums text-white">
            {points.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-white/40">pt</span>
          </p>
          <p className="mt-2 text-[11px] text-white/20">
            バッジ・ポイント機能は近日実装予定です
          </p>
        </div>

        {/* ログアウト */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border border-white/12 py-4 text-center text-[14px] font-medium tracking-wide text-white/40 transition-colors duration-150 hover:border-white/20 hover:text-white/60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            ログアウト
          </button>
        </form>
      </div>
    </main>
  )
}
