import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BodySchema = z.object({
  itemId: z.string().min(1),
  itemTitle: z.string().optional(),
  affiliateUrl: z.string().url(),
  imageUrl: z.string().nullable().optional(),
})

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response(null, { status: 204 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return new Response(null, { status: 400 })

  const { itemId, itemTitle, affiliateUrl, imageUrl } = parsed.data

  const supabase = await createClient()
  await supabase.from('view_history').upsert(
    {
      user_id: user.sub,
      item_id: itemId,
      item_title: itemTitle ?? null,
      affiliate_url: affiliateUrl,
      image_url: imageUrl ?? null,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,item_id' }
  )

  return new Response(null, { status: 204 })
}
