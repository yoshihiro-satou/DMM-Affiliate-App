'use server'

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export const MAX_OSHI_ACTRESSES = 5

export type AddOshiResult = { ok: boolean; count: number; limitReached?: boolean }

/** 推し女優を追加（最大5人）。 */
export async function addOshiActress(
  actressId: string,
  actressName: string
): Promise<AddOshiResult> {
  const claims = await getCurrentUser()
  if (!claims || !actressId || !actressName) return { ok: false, count: 0 }
  const supabase = await createClient()

  const { count } = await supabase
    .from('oshi_actresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', claims.sub)
  const current = count ?? 0

  // 既に登録済みなら成功扱い（冪等）
  const { data: existing } = await supabase
    .from('oshi_actresses')
    .select('id')
    .eq('user_id', claims.sub)
    .eq('actress_id', actressId)
    .maybeSingle()
  if (existing) {
    return { ok: true, count: current }
  }

  if (current >= MAX_OSHI_ACTRESSES) {
    return { ok: false, count: current, limitReached: true }
  }

  await supabase
    .from('oshi_actresses')
    .insert({ user_id: claims.sub, actress_id: actressId, actress_name: actressName })

  revalidatePath('/mypage')
  return { ok: true, count: current + 1 }
}

/** 推し女優を解除。 */
export async function removeOshiActress(actressId: string) {
  const claims = await getCurrentUser()
  if (!claims) return
  const supabase = await createClient()
  await supabase
    .from('oshi_actresses')
    .delete()
    .eq('user_id', claims.sub)
    .eq('actress_id', actressId)
  revalidatePath('/mypage')
}

export async function setOshiDirector(directorName: string) {
  const claims = await getCurrentUser()
  if (!claims) return
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ oshi_director_name: directorName || null })
    .eq('id', claims.sub)
  revalidatePath('/mypage')
}

export async function clearOshiDirector() {
  const claims = await getCurrentUser()
  if (!claims) return
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ oshi_director_name: null })
    .eq('id', claims.sub)
  revalidatePath('/mypage')
}
