'use server'

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function setOshiActress(actressId: string, actressName: string) {
  const claims = await getCurrentUser()
  if (!claims) return
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      oshi_actress_id: actressId || null,
      oshi_actress_name: actressName || null,
    })
    .eq('id', claims.sub)
  revalidatePath('/mypage')
}

export async function clearOshiActress() {
  const claims = await getCurrentUser()
  if (!claims) return
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ oshi_actress_id: null, oshi_actress_name: null })
    .eq('id', claims.sub)
  revalidatePath('/mypage')
}
