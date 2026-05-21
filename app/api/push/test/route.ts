import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'
import webpush from 'web-push'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKeyJwk = process.env.VAPID_PRIVATE_KEY_JWK
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

  if (!publicKey || !privateKeyJwk) {
    return Response.json({ error: 'VAPID keys not set' }, { status: 500 })
  }

  let privateKey: string
  try {
    const jwk = JSON.parse(privateKeyJwk) as { d?: string }
    if (!jwk.d) throw new Error('missing d field')
    privateKey = jwk.d
  } catch (err) {
    return Response.json({ error: 'VAPID_PRIVATE_KEY_JWK parse error', detail: String(err) }, { status: 500 })
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string; title?: string; message?: string }
    const userId = body.userId
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: subs, error: dbError } = await admin
      .from('notification_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', userId)

    if (dbError) return Response.json({ error: 'db error', detail: dbError.message }, { status: 500 })
    if (!subs || subs.length === 0) {
      return Response.json({ error: 'no subscriptions found' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: body.title ?? 'テスト通知',
      body: body.message ?? 'プッシュ通知が正常に動作しています 🎉',
      url: '/mypage',
      tag: 'test',
    })

    const results: { endpoint: string; status: number; error?: string }[] = []

    for (const sub of subs) {
      const keys = sub.keys as { p256dh: string; auth: string }
      try {
        const res = await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          payload,
          { TTL: 60 }
        )
        results.push({ endpoint: sub.endpoint.slice(0, 40) + '...', status: res.statusCode })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        results.push({
          endpoint: sub.endpoint.slice(0, 40) + '...',
          status: e.statusCode ?? 0,
          error: e.body ?? e.message ?? String(err),
        })
      }
    }

    return Response.json({ sent: results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push/test] error:', err)
    return Response.json({ error: message }, { status: 500 })
  }
}
