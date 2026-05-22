import { NextRequest, NextResponse } from 'next/server'
import { fetchActressList } from '@/lib/dmm/client'
import { ActressListQuerySchema } from '@/types/dmm'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = Object.fromEntries(searchParams.entries())

  const parsed = ActressListQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await fetchActressList(parsed.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err) {
    console.error('[DMM Actresses API]', err)
    // エラー時は空の結果を返す（UIで「見つかりませんでした」を正常表示）
    return NextResponse.json({
      result_count: 0,
      total_count: 0,
      first_position: 1,
      actress: [],
    })
  }
}
