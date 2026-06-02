import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * 通知購読者の実数を返す（施策9・ソーシャルプルーフ用）。
 * RLS で本人しか見えないため admin client で集計。集計値のみを公開する。
 * 景表法対策として必ず実DB値を返す（水増し禁止）。
 */
export async function GET(): Promise<Response> {
  try {
    const supabase = createAdminClient()
    // endpoint は購読デバイス単位で一意。ゲスト購読（user_id null）も実数に含める。
    const { data } = await supabase.from('notification_subscriptions').select('endpoint')
    const uniqueDevices = new Set((data ?? []).map((r) => r.endpoint)).size

    return Response.json(
      { count: uniqueDevices },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    )
  } catch {
    return Response.json({ count: 0 })
  }
}
