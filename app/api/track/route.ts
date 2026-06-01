import { getCurrentUser } from '@/lib/supabase/server'
import { recordEvent, EVENT_TYPES, type EventType } from '@/lib/events'
import { z } from 'zod'

const BodySchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  sessionId: z.string().max(64).optional(),
  ref: z.string().max(128).nullish(),
  itemId: z.string().max(64).nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
})

/**
 * クライアントからの計測イベント受け口（追加12）。
 * navigator.sendBeacon で叩かれるため body は text/plain のこともある。
 */
export async function POST(request: Request): Promise<Response> {
  const raw = await request.text().catch(() => '')
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) return new Response(null, { status: 400 })

  // ログイン中ならユーザーIDも紐付ける（任意）
  const user = await getCurrentUser().catch(() => null)

  await recordEvent({
    eventType: parsed.data.eventType as EventType,
    sessionId: parsed.data.sessionId ?? null,
    userId: user?.sub ?? null,
    ref: parsed.data.ref ?? null,
    itemId: parsed.data.itemId ?? null,
    meta: parsed.data.meta ?? null,
  })

  return new Response(null, { status: 204 })
}
