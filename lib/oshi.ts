import 'server-only'
import { cache } from 'react'
import { createClient, getCurrentUser } from '@/lib/supabase/server'

export type OshiActress = { id: string; name: string }
export type OshiDirector = { name: string }

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

/**
 * ログインユーザーの推し監督一覧（最大5人・登録順）を返す（追加19）。
 * 監督は DMM の安定IDを持たないため名前のみ管理する。
 */
export const getOshiDirectors = cache(async (): Promise<OshiDirector[]> => {
  const claims = await getCurrentUser()
  if (!claims) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('oshi_directors')
    .select('director_name, created_at')
    .eq('user_id', claims.sub)
    .order('created_at', { ascending: true })
  return (data ?? []).map((r) => ({ name: r.director_name as string }))
})
