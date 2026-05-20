import { Suspense } from 'react'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Heart, X, Bookmark, BookOpen } from 'lucide-react'
import { buildUserProfile, topEntries } from '@/lib/personalization'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { OshiActressSetting } from './_components/OshiActressSetting'
import { signOut } from './actions'

export const metadata = {
  title: 'マイページ',
  robots: 'noindex,nofollow',
}

// サーバーコンポーネント内で Date.now() を直接呼ぶと react-hooks/purity に引っかかるため
// コンポーネント外の通常関数に切り出す
function getDateRanges() {
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const days = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date(now - (13 - idx) * 24 * 60 * 60 * 1000)
    return {
      date: d.toISOString().slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    }
  })
  return { thirtyDaysAgo, days }
}

// ── 活動統計（高速・Supabase のみ） ──────────────────────────────────────────

async function ActivityStats({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { thirtyDaysAgo, days: dayTemplate } = getDateRanges()

  const [likeRes, skipRes, favRes, seriesRes, activityRes] = await Promise.all([
    supabase
      .from('swipe_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'like'),
    supabase
      .from('swipe_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'skip'),
    supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('followed_series')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('swipe_history')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),
  ])

  const likeCount = likeRes.count ?? 0
  const skipCount = skipRes.count ?? 0
  const favCount = favRes.count ?? 0
  const seriesCount = seriesRes.count ?? 0

  // 直近14日間の日別スワイプ数を集計
  const dailyCounts = new Map<string, number>()
  for (const row of activityRes.data ?? []) {
    const day = (row.created_at as string).slice(0, 10)
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1)
  }

  const days = dayTemplate.map(({ date, label }) => ({
    date,
    label,
    count: dailyCounts.get(date) ?? 0,
  }))

  const maxCount = Math.max(...days.map((d) => d.count), 1)

  return (
    <div className="flex flex-col gap-5">
      {/* 統計カード */}
      <div className="rounded-lg border border-white/8 bg-white/3 p-4">
        <p
          className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          ACTIVITY
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { Icon: Heart, label: 'いいね', count: likeCount, color: 'text-red-400' },
            { Icon: X, label: 'スキップ', count: skipCount, color: 'text-white/30' },
            { Icon: Bookmark, label: 'お気に入り', count: favCount, color: 'text-yellow-400' },
            { Icon: BookOpen, label: 'シリーズ', count: seriesCount, color: 'text-blue-400' },
          ].map(({ Icon, label, count, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <Icon size={16} className={color} />
              <p className="text-[18px] font-black tabular-nums text-white">{count}</p>
              <p className="text-[9px] text-white/30">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 直近14日アクティビティチャート */}
      <div className="rounded-lg border border-white/8 bg-white/3 p-4">
        <p
          className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          直近14日の閲覧数
        </p>
        <div className="flex h-16 items-end gap-px">
          {days.map(({ date, count }) => (
            <div key={date} className="flex flex-1 flex-col items-center gap-px">
              <div
                className="w-full rounded-t-sm bg-red-600/60 transition-all"
                style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[9px] text-white/20">{days[0]?.label}</span>
          <span className="text-[9px] text-white/20">今日</span>
        </div>
      </div>
    </div>
  )
}

// ── ストリーク ────────────────────────────────────────────────────────────────

async function StreakSection({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('login_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle()

  const currentStreak = data?.current_streak ?? 0
  if (currentStreak === 0) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 px-5 py-4">
      <p
        className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        STREAK
      </p>
      <p className="text-[22px] font-black text-white">
        🔥 {currentStreak}日連続
      </p>
    </div>
  )
}

// ── よく見る女優 TOP5（低速・DMM API あり） ──────────────────────────────────

async function TopActresses({ userId }: { userId: string }) {
  const profile = await buildUserProfile(userId)
  const top = topEntries(profile.actressScores, 5)

  if (top.length === 0) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        よく見る女優 TOP5
      </p>
      <ol className="flex flex-col gap-2">
        {top.map(({ id, score }, i) => (
          <li key={id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  i === 0
                    ? 'bg-yellow-400 text-black'
                    : i === 1
                      ? 'bg-white/70 text-black'
                      : i === 2
                        ? 'bg-orange-400 text-black'
                        : 'bg-white/10 text-white/50'
                }`}
              >
                {i + 1}
              </span>
              <a
                href={`/actress/${id}`}
                className="text-[12px] text-white/60 hover:text-white"
              >
                {profile.actressNames.get(id) ?? `女優 #${id}`}
              </a>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="h-1.5 rounded-full bg-red-600/50"
                style={{ width: `${Math.round((score / top[0].score) * 60)}px` }}
              />
              <span className="w-8 text-right text-[10px] tabular-nums text-white/30">
                {score}pt
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function TopActressesSkeleton() {
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-3 h-3 w-28 animate-pulse rounded bg-white/10" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ページ本体 ────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@')
  if (atIdx < 0) return email
  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx)
  return `${local.slice(0, 2)}***${domain}`
}

export default async function MyPage() {
  const claims = await getCurrentUser()
  if (!claims) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, oshi_actress_id, oshi_actress_name')
    .eq('id', claims.sub)
    .single()

  const metaDisplayName = (
    (claims as Record<string, unknown>).user_metadata as Record<string, string> | undefined
  )?.display_name
  const displayName = profile?.display_name ?? metaDisplayName ?? 'ゲスト'
  const rawEmail = profile?.email ?? (claims.email as string | undefined) ?? ''

  // profiles に display_name が未設定の既存ユーザーをサイレント修正
  if (!profile?.display_name && metaDisplayName) {
    const admin = createAdminClient()
    void admin.from('profiles').upsert({
      id: claims.sub,
      email: rawEmail,
      display_name: metaDisplayName,
    })
  }
  const email = maskEmail(rawEmail)
  const oshiActress =
    profile?.oshi_actress_id && profile?.oshi_actress_name
      ? { id: profile.oshi_actress_id, name: profile.oshi_actress_name }
      : null

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.08) 0%, transparent 70%)',
        }}
      />

      {/* モバイル: flex col / デスクトップ: 2カラムグリッド */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-10 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-5 md:py-8">

        {/* ヘッダー + プロフィール: 常に2列全幅 */}
        <div className="flex flex-col gap-5 md:col-span-2">
          <div className="flex flex-col items-center gap-3">
            <div className="h-px w-12 bg-red-700" />
            <span
              className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              MY PAGE
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-2xl font-black tracking-tight text-white">
              {displayName}
            </p>
            <p className="text-[12px] text-white/30">{email}</p>
          </div>
          <div className="h-px w-full bg-white/8" />
        </div>

        {/* 推し女優設定: 常に2列全幅 */}
        <div className="md:col-span-2">
          <OshiActressSetting current={oshiActress} />
        </div>

        {/* 左カラム: 活動統計 */}
        <ActivityStats userId={claims.sub} />

        {/* 右カラム: ストリーク */}
        <StreakSection userId={claims.sub} />

        {/* 左カラム: よく見る女優 */}
        <Suspense fallback={<TopActressesSkeleton />}>
          <TopActresses userId={claims.sub} />
        </Suspense>

        {/* 右カラム: ボタン群 */}
        <div className="flex flex-col gap-3">
          <PushSubscribeButton />
          <Link
            href="/forgot-password"
            className="block w-full rounded-lg border border-white/12 py-4 text-center text-[14px] font-medium tracking-wide text-white/40 transition-colors duration-150 hover:border-white/20 hover:text-white/60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            パスワードを変更する
          </Link>
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

      </div>
    </main>
  )
}
