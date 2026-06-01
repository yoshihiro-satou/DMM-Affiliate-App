import { broadcastSale } from '@/lib/broadcast/sale-broadcast'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * セール速報の分散配信トリガー（追加13）。
 * daily-revalidate Worker（JST 0:01）から secret 付きで叩かれる。
 * Web Push はキュー投入のみ → push-notify Worker が実送信。
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  const { message, results } = await broadcastSale({ dryRun })

  if (!message) {
    return Response.json({ broadcast: false, reason: 'no sale items today' })
  }

  console.log('[sale-notify]', JSON.stringify({ dryRun, title: message.title, results }))
  return Response.json({
    broadcast: true,
    dryRun,
    message: dryRun ? message : { title: message.title },
    results,
  })
}
