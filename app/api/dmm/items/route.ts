import { NextRequest, NextResponse } from 'next/server'
import { fetchItemList } from '@/lib/dmm/client'
import { ItemListQuerySchema } from '@/types/dmm'
import type { DmmItem } from '@/types/dmm'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = Object.fromEntries(searchParams.entries())

  const parsed = ItemListQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    // floor=mixed: videoa + videoc を並列取得してインターリーブ返却
    if (parsed.data.floor === 'mixed') {
      const { floor: _, hits, offset, ...restParams } = parsed.data
      const realHits = Math.ceil((hits ?? 20) / 2)
      const realOffset = Math.ceil(((offset ?? 1) - 1) / 2) + 1
      const [videoa, videoc] = await Promise.all([
        fetchItemList({ ...restParams, service: 'digital', floor: 'videoa', hits: realHits, offset: realOffset }),
        fetchItemList({ ...restParams, service: 'digital', floor: 'videoc', hits: realHits, offset: realOffset }),
      ])
      const seen = new Set<string>()
      const merged: DmmItem[] = []
      const maxLen = Math.max(videoa.items.length, videoc.items.length)
      for (let i = 0; i < maxLen; i++) {
        if (videoa.items[i] && !seen.has(videoa.items[i].content_id)) {
          seen.add(videoa.items[i].content_id)
          merged.push(videoa.items[i])
        }
        if (videoc.items[i] && !seen.has(videoc.items[i].content_id)) {
          seen.add(videoc.items[i].content_id)
          merged.push(videoc.items[i])
        }
      }
      const result = { ...videoa, items: merged, total_count: videoa.total_count + videoc.total_count }
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      })
    }

    const result = await fetchItemList(parsed.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err) {
    console.error('[DMM Items API]', err)
    return NextResponse.json({ error: 'DMM API fetch failed' }, { status: 502 })
  }
}
