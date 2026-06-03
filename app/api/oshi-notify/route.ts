import { createAdminClient } from '@/lib/supabase/admin'
import { fetchDailyDealContents } from '@/lib/dmm/scraper'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contents = await fetchDailyDealContents(50)

  // 出演女優 ID → 名前のマップ（全アイテム横断）
  const actressMap = new Map<string, string>()
  for (const item of contents) {
    for (const a of item.actresses ?? []) {
      if (a.id && !actressMap.has(a.id)) actressMap.set(a.id, a.name)
    }
  }

  if (actressMap.size === 0) {
    return Response.json({ notified: 0, reason: 'no actresses in daily deals' })
  }

  const admin = createAdminClient()

  // 推し女優（最大5人）が日替わり出演女優と一致するユーザーを取得
  const { data: oshiRows } = await admin
    .from('oshi_actresses')
    .select('user_id, actress_id, actress_name')
    .in('actress_id', [...actressMap.keys()])

  if (!oshiRows || oshiRows.length === 0) {
    return Response.json({ notified: 0, reason: 'no users with matching oshi' })
  }

  // ユーザーごとに1件（最初にマッチした推し）へ集約して通知の重複を防ぐ
  const profiles = [
    ...new Map(
      oshiRows.map((r) => [
        r.user_id,
        { id: r.user_id, oshi_actress_id: r.actress_id, oshi_actress_name: r.actress_name },
      ])
    ).values(),
  ]

  // 今日すでに同タイプの通知を送ったユーザーはスキップ
  const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  todayJst.setUTCHours(todayJst.getUTCHours() - (todayJst.getUTCHours() % 24), 0, 0, 0)
  const { data: alreadySent } = await admin
    .from('notification_queue')
    .select('user_id')
    .eq('type', 'oshi_daily_deal')
    .gte('created_at', new Date(Date.now() - 9 * 60 * 60 * 1000 * (new Date().getUTCHours() % 24 + 1)).toISOString())

  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.user_id))

  const toInsert = profiles
    .filter((p) => p.oshi_actress_id && !alreadySentIds.has(p.id))
    .map((p) => {
      const actressName = actressMap.get(p.oshi_actress_id!) ?? p.oshi_actress_name ?? '推し女優'
      const firstItem = contents.find((c) =>
        c.actresses?.some((a) => a.id === p.oshi_actress_id)
      )
      return {
        user_id: p.id,
        type: 'oshi_daily_deal',
        status: 'pending',
        payload: {
          title: `${actressName}さんが日替わり特売に登場！`,
          body: firstItem
            ? `「${firstItem.title.slice(0, 40)}」が本日限り特別価格`
            : '今日だけの特別価格をチェック',
          // ?ref=push_oshi で「通知→クリック」を funnel_by_ref に計測（追加18）
          url: '/?ref=push_oshi',
          tag: 'oshi_daily_deal',
        },
      }
    })

  if (toInsert.length === 0) {
    return Response.json({ notified: 0, reason: 'all already notified today' })
  }

  await admin.from('notification_queue').insert(toInsert)
  console.log('[oshi-notify] inserted', toInsert.length, 'notifications')

  return Response.json({ notified: toInsert.length })
}
