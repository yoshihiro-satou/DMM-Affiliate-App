'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AGE_CHECK_COOKIE, AGE_CHECK_VALUE } from '@/lib/constants/age-check'
import { recordEvent } from '@/lib/events'

export async function confirmAge(formData: FormData) {
  const cookieStore = await cookies()

  cookieStore.set(AGE_CHECK_COOKIE, AGE_CHECK_VALUE, {
    maxAge: 60 * 60 * 24 * 365, // 1年
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  // ファネル計測: Age通過（追加12）。session_id / ref は Tracker が Cookie に保存済み
  await recordEvent({
    eventType: 'age_pass',
    sessionId: cookieStore.get('fp_sid')?.value ?? null,
    ref: cookieStore.get('fp_ref')?.value ?? null,
  })

  const from = formData.get('from') as string | null
  // 外部URLやプロトコル相対URLへのオープンリダイレクトを防止
  const destination = from && from.startsWith('/') ? from : '/'

  // 初回はオンボーディング（/welcome）へ。完了済みなら本来の遷移先へ（施策3）
  const onboarded = cookieStore.get('fp_onboarded')?.value === '1'
  if (!onboarded && !destination.startsWith('/welcome')) {
    redirect(`/welcome?from=${encodeURIComponent(destination)}`)
  }
  redirect(destination)
}
