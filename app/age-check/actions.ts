'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AGE_CHECK_COOKIE, AGE_CHECK_VALUE } from '@/lib/constants/age-check'

export async function confirmAge(formData: FormData) {
  const cookieStore = await cookies()

  cookieStore.set(AGE_CHECK_COOKIE, AGE_CHECK_VALUE, {
    maxAge: 60 * 60 * 24 * 365, // 1年
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  const from = formData.get('from') as string | null
  // 外部URLやプロトコル相対URLへのオープンリダイレクトを防止
  const destination = from && from.startsWith('/') ? from : '/'
  redirect(destination)
}
