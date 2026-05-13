import { NextRequest, NextResponse } from 'next/server'
import { fetchItemList } from '@/lib/dmm/client'
import { ItemListQuerySchema } from '@/types/dmm'

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
    const result = await fetchItemList(parsed.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err) {
    console.error('[DMM Items API]', err)
    return NextResponse.json({ error: 'DMM API fetch failed' }, { status: 502 })
  }
}
