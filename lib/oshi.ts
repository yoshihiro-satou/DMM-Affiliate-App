import 'server-only'
import { cache } from 'react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'

export type OshiActress = { id: string; name: string }

/**
 * ログインユーザーの推し女優一覧（最大5人・登録順）を返す。
 * React.cache でリクエスト内の重複呼び出しを排除。
 */
export const getOshiActresses = cache(async (): Promise<OshiActress[]> => {
  const claims = await getCurrentUser()
  if (!claims) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('oshi_actresses')
    .select('actress_id, actress_name, created_at')
    .eq('user_id', claims.sub)
    .order('created_at', { ascending: true })
  return (data ?? []).map((r) => ({
    id: r.actress_id as string,
    name: r.actress_name as string,
  }))
})
