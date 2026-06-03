import { createAdminClient } from '@/lib/supabase/admin'
import { fetchItemList } from '@/lib/dmm/client'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * 推し監督の新作通知（追加19）。oshi-notify と同じ仕組みで、監督は DMM の
 * キーワード検索（sort=date）で新作を監視する。
 * daily-revalidate Worker（JST 0:01）から secret 付きで叩かれる。
 */

// JST の当日・前日 YYYY-MM-DD
function jstDateStrings(): { today: string; yesterday: string } {
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const today = nowJst.toISOString().slice(0, 10)
  const y = new Date(nowJst.getTime() - 86_400_000)
  return { today, yesterday: y.toISOString().slice(0, 10) }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 監督名 → フォローしているユーザーID一覧
  const { data: rows } = await admin
    .from('oshi_directors')
    .select('user_id, director_name')

  if (!rows || rows.length === 0) {
    return Response.json({ notified: 0, reason: 'no oshi directors' })
  }

  const followers = new Map<string, Set<string>>()
  for (const r of rows) {
    const name = r.director_name as string
    if (!name) continue
    if (!followers.has(name)) followers.set(name, new Set())
    followers.get(name)!.add(r.user_id as string)
  }

  const { today, yesterday } = jstDateStrings()

  // 監督ごとに新作（発売日が当日/前日）を1件検索する
  type NewRelease = { name: string; title: string }
  const directorNames = [...followers.keys()]
  const found = await Promise.all(
    directorNames.map(async (name): Promise<NewRelease | null> => {
      const result = await fetchItemList({
        keyword: name,
        sort: 'date',
        hits: 3,
        service: 'digital',
        floor: 'videoa',
      }).catch(() => null)
      const newest = result?.items?.[0]
      const dateStr = newest?.date?.slice(0, 10)
      const isNew = !!dateStr && (dateStr === today || dateStr === yesterday)
      return isNew && newest ? { name, title: newest.title } : null
    })
  )

  const newReleases = found.filter((x): x is NewRelease => x !== null)
  if (newReleases.length === 0) {
    return Response.json({ notified: 0, reason: 'no new director releases today' })
  }

  // 今日すでに new_release 通知を積んだユーザーはスキップ（1日1通まで）
  const todayStartUtc = new Date(`${today}T00:00:00+09:00`).toISOString()
  const { data: alreadySent } = await admin
    .from('notification_queue')
    .select('user_id')
    .eq('type', 'new_release')
    .gte('created_at', todayStartUtc)
  const alreadyIds = new Set((alreadySent ?? []).map((r) => r.user_id).filter(Boolean))

  // ユーザー単位に集約（複数監督に新作があっても最初の1件で通知）
  const perUser = new Map<string, NewRelease>()
  for (const nr of newReleases) {
    for (const uid of followers.get(nr.name) ?? []) {
      if (alreadyIds.has(uid) || perUser.has(uid)) continue
      perUser.set(uid, nr)
    }
  }

  const toInsert = [...perUser.entries()].map(([user_id, nr]) => ({
    user_id,
    endpoint: null,
    type: 'new_release' as const,
    status: 'pending' as const,
    payload: {
      title: `${nr.name}監督の新作が登場🎬`,
      body: `「${nr.title.slice(0, 40)}」が新着。チェックしてみよう`,
      // ?ref=push_director で「通知→クリック」を計測（追加18）
      url: '/?ref=push_director',
      tag: 'director_new_release',
    },
  }))

  if (toInsert.length === 0) {
    return Response.json({ notified: 0, reason: 'all already notified today' })
  }

  await admin.from('notification_queue').insert(toInsert)
  console.log('[oshi-director-notify] inserted', toInsert.length, 'notifications')

  return Response.json({ notified: toInsert.length })
}
