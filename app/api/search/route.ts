import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchItems } from '@/lib/search'

export const runtime = 'nodejs'

const SearchQuerySchema = z.object({
  q: z.string().max(100).default(''),
  sort: z.enum(['rank', 'date', '-price', 'price', 'review']).default('rank'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  hits: z.coerce.number().int().min(1).max(40).default(20),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsed = SearchQuerySchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const { q, sort, page, hits } = parsed.data
    const result = await searchItems({ q, sort, page, hitsPerPage: hits })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[api/search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
}
