import { broadcastNewRelease } from '@/lib/broadcast/newrelease-broadcast'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * 「今日の新作ピックアップ」の Telegram チャンネル配信トリガー（追加11）。
 * daily-revalidate Worker（JST 0:01）から secret 付きで叩かれる。
 * 全員共通の編集版なのでチャンネル1投稿のみ（Web Push へは積まない）。
 * ?dry=1 で投稿せず内容だけ確認できる。
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  const { message, results } = await broadcastNewRelease({ dryRun })

  if (!message) {
    return Response.json({ broadcast: false, reason: 'no fresh new releases today' })
  }

  console.log('[newrelease-notify]', JSON.stringify({ dryRun, title: message.title, results }))
  return Response.json({
    broadcast: true,
    dryRun,
    message: dryRun ? message : { title: message.title },
    results,
  })
}
