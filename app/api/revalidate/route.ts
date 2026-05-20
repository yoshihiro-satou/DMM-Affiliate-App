import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')
  const expected = process.env.REVALIDATE_SECRET

  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  revalidatePath('/')
  console.log('[revalidate] / revalidated at', new Date().toISOString())

  return Response.json({ revalidated: true, at: new Date().toISOString() })
}
