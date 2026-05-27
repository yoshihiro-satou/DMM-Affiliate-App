import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'

export const metadata: Metadata = {
  title: 'シリーズ',
  description: 'フォロー中のシリーズ一覧',
}

export default async function SeriesListPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: followedSeries } = await supabase
    .from('followed_series')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false })

  const series = followedSeries ?? []

  // フォロー中シリーズごとの読了数を一括取得
  const seriesIds = series.map((s) => s.series_id)
  const progressCounts = new Map<number, number>()

  if (seriesIds.length > 0) {
    const { data: progress } = await supabase
      .from('series_progress')
      .select('series_id')
      .eq('user_id', user.sub)
      .in('series_id', seriesIds)

    for (const row of progress ?? []) {
      const count = progressCounts.get(row.series_id) ?? 0
      progressCounts.set(row.series_id, count + 1)
    }
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <h1 className="text-[22px] font-black tracking-tight text-white">シリーズ</h1>
        <p className="mt-0.5 text-[11px] text-white/55">{series.length}件フォロー中</p>
      </div>

      {series.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-white/5">
          {series.map((s) => (
            <SeriesCard
              key={s.id}
              series={s}
              readCount={progressCounts.get(s.series_id) ?? 0}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function SeriesCard({
  series,
  readCount,
}: {
  series: Tables<'followed_series'>
  readCount: number
}) {
  return (
    <Link
      href={`/series/${series.series_id}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 active:bg-white/5"
    >
      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-white">
          {series.series_name}
        </p>
        <p className="text-[11px] text-white/55">{readCount}巻読了</p>
      </div>
      <span className="shrink-0 text-[18px] text-white/40">›</span>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <BookOpen size={48} className="text-white/10" />
      <div>
        <p className="text-[15px] font-semibold text-white/65">フォロー中のシリーズなし</p>
        <p className="mt-1 text-[12px] text-white/50">
          シリーズページでフォローして新刊通知を受け取りましょう
        </p>
      </div>
    </div>
  )
}
