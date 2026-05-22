import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Heart, X, Bookmark, BookOpen } from 'lucide-react'
import { buildUserProfile, topEntries } from '@/lib/personalization'
import { fetchItemList } from '@/lib/dmm/client'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { OshiActressSetting } from './_components/OshiActressSetting'
import { OshiDirectorSetting } from './_components/OshiDirectorSetting'
import { signOut } from './actions'

export const metadata = {
  title: 'マイページ',
  robots: 'noindex,nofollow',
}

// ── 活動統計（高速・Supabase のみ） ──────────────────────────────────────────

async function ActivityStats({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [likeRes, skipRes, favRes, seriesRes, viewHistRes] = await Promise.all([
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
      .from('view_history')
      .select('item_id, item_title, affiliate_url, image_url')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(20),
  ])

  const likeCount = likeRes.count ?? 0
  const skipCount = skipRes.count ?? 0
  const favCount = favRes.count ?? 0
  const seriesCount = seriesRes.count ?? 0
  const recentViews = viewHistRes.data ?? []

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

      {/* 直近の閲覧履歴 */}
      {recentViews.length > 0 && (
        <div className="rounded-lg border border-white/8 bg-white/3 p-4">
          <p
            className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            直近の閲覧履歴
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recentViews.map((v) => (
              <a
                key={v.item_id}
                href={v.affiliate_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="relative shrink-0 w-20 overflow-hidden rounded-lg bg-white/5"
              >
                {v.image_url ? (
                  <Image
                    src={v.image_url}
                    alt={v.item_title ?? ''}
                    width={80}
                    height={107}
                    className="aspect-[80/107] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[80/107] w-full bg-white/5" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/40">
                  PR
                </span>
                <p className="line-clamp-2 px-1 pb-1 pt-0.5 text-[8px] leading-tight text-white/50">
                  {v.item_title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── コミュニティランキング共通ヘルパー ────────────────────────────────────────

const MEDAL_COLORS = [
  'bg-yellow-400 text-black',
  'bg-white/60 text-black',
  'bg-orange-400 text-black',
]

function RankingSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-2 h-3 w-40 animate-pulse rounded bg-white/10" />
      <p className="text-[9px] text-white/20">{label}</p>
      <div className="mt-3 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 flex-1 animate-pulse rounded bg-white/8" />
            <div className="h-3 w-8 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── みんなの推し女優ランキング ─────────────────────────────────────────────────

async function CommunityActressRanking() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('oshi_actress_id, oshi_actress_name')
    .not('oshi_actress_id', 'is', null)

  const THRESHOLD = 15

  if (!data || data.length < THRESHOLD) {
    return (
      <div className="rounded-lg border border-white/8 bg-white/3 p-4">
        <p
          className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/30"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          みんなの推し女優ランキング
        </p>
        <p className="text-[13px] text-white/40">
          準備中。みんな！推し女優を登録してね！
        </p>
      </div>
    )
  }

  const counts = new Map<string, { name: string; count: number }>()
  for (const row of data) {
    if (!row.oshi_actress_id || !row.oshi_actress_name) continue
    const existing = counts.get(row.oshi_actress_id)
    if (existing) existing.count++
    else counts.set(row.oshi_actress_id, { name: row.oshi_actress_name, count: 1 })
  }

  const top3 = Array.from(counts.entries())
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  if (top3.length === 0) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        みんなの推し女優ランキング
      </p>
      <ol className="flex flex-col gap-3">
        {top3.map(({ id, name, count }, i) => (
          <li key={id} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${MEDAL_COLORS[i]}`}>
              {i + 1}
            </span>
            <a href={`/actress/${id}`} className="flex-1 text-[13px] text-white/70 hover:text-white">
              {name}
            </a>
            <span className="text-[11px] tabular-nums text-white/30">{count}人</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── みんなの推し監督ランキング ─────────────────────────────────────────────────

async function CommunityDirectorRanking() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('oshi_director_name')
    .not('oshi_director_name', 'is', null)

  const THRESHOLD = 15

  if (!data || data.length < THRESHOLD) {
    return (
      <div className="rounded-lg border border-white/8 bg-white/3 p-4">
        <p
          className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/30"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          みんなの推し監督ランキング
        </p>
        <p className="text-[13px] text-white/40">
          準備中。みんな！推し監督を登録してね！
        </p>
      </div>
    )
  }

  const counts = new Map<string, number>()
  for (const row of data) {
    const name = row.oshi_director_name
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const top3 = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  if (top3.length === 0) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        みんなの推し監督ランキング
      </p>
      <ol className="flex flex-col gap-3">
        {top3.map(({ name, count }, i) => (
          <li key={name} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${MEDAL_COLORS[i]}`}>
              {i + 1}
            </span>
            <span className="flex-1 text-[13px] text-white/70">{name}</span>
            <span className="text-[11px] tabular-nums text-white/30">{count}人</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── 推し作品一覧（横スクロール帯） ────────────────────────────────────────────

function WorksScrollSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/10" />
      <p className="mb-2 text-[9px] text-white/20">{label}</p>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[107px] w-20 shrink-0 animate-pulse rounded-lg bg-white/8" />
        ))}
      </div>
    </div>
  )
}

async function OshiActressWorks({
  actressId,
  actressName,
}: {
  actressId: string | null
  actressName: string
}) {
  if (!actressId) return null
  const id = parseInt(actressId, 10)
  if (isNaN(id)) return null

  const result = await fetchItemList({
    article: 'actress',
    article_id: id,
    sort: 'date',
    hits: 12,
    service: 'digital',
    floor: 'videoa',
  }).catch(() => null)

  if (!result?.items?.length) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {actressName} の最新作
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {result.items.map((item) => (
          <a
            key={item.content_id}
            href={item.affiliateURL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 w-20 overflow-hidden rounded-lg bg-white/5"
          >
            {item.imageURL?.list && (
              <Image
                src={item.imageURL.list}
                alt={item.title}
                width={80}
                height={107}
                className="aspect-[80/107] w-full object-cover"
              />
            )}
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/40">
              PR
            </span>
            <p className="line-clamp-2 px-1 pb-1 pt-0.5 text-[8px] leading-tight text-white/50">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}

async function OshiDirectorWorks({ directorName }: { directorName: string }) {
  const result = await fetchItemList({
    keyword: directorName,
    sort: 'date',
    hits: 12,
    service: 'digital',
    floor: 'videoa',
  }).catch(() => null)

  if (!result?.items?.length) return null

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {directorName} の最新作
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {result.items.map((item) => (
          <a
            key={item.content_id}
            href={item.affiliateURL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 w-20 overflow-hidden rounded-lg bg-white/5"
          >
            {item.imageURL?.list && (
              <Image
                src={item.imageURL.list}
                alt={item.title}
                width={80}
                height={107}
                className="aspect-[80/107] w-full object-cover"
              />
            )}
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/40">
              PR
            </span>
            <p className="line-clamp-2 px-1 pb-1 pt-0.5 text-[8px] leading-tight text-white/50">
              {item.title}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}

async function OshiCombinedWorks({
  actressId,
  actressName,
  directorName,
}: {
  actressId: string | null
  actressName: string
  directorName: string
}) {
  if (!actressId) return null
  const id = parseInt(actressId, 10)
  if (isNaN(id)) return null

  const result = await fetchItemList({
    article: 'actress',
    article_id: id,
    keyword: directorName,
    sort: 'date',
    hits: 12,
    service: 'digital',
    floor: 'videoa',
  }).catch(() => null)

  const items = result?.items ?? []

  return (
    <div className="rounded-lg border border-rose-900/30 bg-rose-950/20 p-4">
      <p
        className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-rose-400/60"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        推し女優 × 推し監督
      </p>
      <p className="mb-3 text-[11px] text-white/40">
        {actressName} × {directorName}
      </p>
      {items.length === 0 ? (
        <p className="text-[13px] text-white/30">コラボなし（登録データ上）</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {items.map((item) => (
            <a
              key={item.content_id}
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative shrink-0 w-20 overflow-hidden rounded-lg bg-white/5"
            >
              {item.imageURL?.list && (
                <Image
                  src={item.imageURL.list}
                  alt={item.title}
                  width={80}
                  height={107}
                  className="aspect-[80/107] w-full object-cover"
                />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/40">
                PR
              </span>
              <p className="line-clamp-2 px-1 pb-1 pt-0.5 text-[8px] leading-tight text-white/50">
                {item.title}
              </p>
            </a>
          ))}
        </div>
      )}
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
    .select('display_name, email, oshi_actress_id, oshi_actress_name, oshi_director_name')
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
  const oshiActress = profile?.oshi_actress_name
    ? { id: profile.oshi_actress_id ?? null, name: profile.oshi_actress_name }
    : null
  const oshiDirector = profile?.oshi_director_name ?? null

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

        {/* 推し女優設定 */}
        <OshiActressSetting current={oshiActress} />

        {/* 推し女優の最新作 */}
        {oshiActress && (
          <Suspense fallback={<WorksScrollSkeleton label={`${oshiActress.name} の最新作`} />}>
            <OshiActressWorks actressId={oshiActress.id} actressName={oshiActress.name} />
          </Suspense>
        )}

        {/* みんなの推し女優ランキング */}
        <Suspense fallback={<RankingSkeleton label="みんなの推し女優ランキング" />}>
          <CommunityActressRanking />
        </Suspense>

        {/* 推し監督設定 */}
        <OshiDirectorSetting current={oshiDirector} />

        {/* 推し監督の最新作 */}
        {oshiDirector && (
          <Suspense fallback={<WorksScrollSkeleton label={`${oshiDirector} の最新作`} />}>
            <OshiDirectorWorks directorName={oshiDirector} />
          </Suspense>
        )}

        {/* 推し女優 × 推し監督 */}
        {oshiActress && oshiDirector && (
          <Suspense fallback={<WorksScrollSkeleton label={`${oshiActress.name} × ${oshiDirector}`} />}>
            <OshiCombinedWorks
              actressId={oshiActress.id}
              actressName={oshiActress.name}
              directorName={oshiDirector}
            />
          </Suspense>
        )}

        {/* みんなの推し監督ランキング */}
        <Suspense fallback={<RankingSkeleton label="みんなの推し監督ランキング" />}>
          <CommunityDirectorRanking />
        </Suspense>

        {/* 左カラム: 活動統計 */}
        <ActivityStats userId={claims.sub} />

        {/* 右カラム: ストリーク */}
        <StreakSection userId={claims.sub} />

        {/* 左カラム: よく見る女優 */}
        <Suspense fallback={<TopActressesSkeleton />}>
          <TopActresses userId={claims.sub} />
        </Suspense>

        {/* 右カラム: ボタン群 */}
        <div className="flex h-full flex-col gap-3">
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
          <div className="mt-auto flex flex-col items-center gap-1.5 pt-2">
            <p className="text-[10px] text-white/20">お問い合わせ</p>
            <a
              href="https://x.com/yoshihirock0710"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-white/30 transition-colors hover:border-white/25 hover:text-white/60"
              aria-label="お問い合わせ"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
              </svg>
            </a>
          </div>
        </div>


      </div>

    </main>
  )
}
