'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function confirmAge(formData: FormData) {
  const cookieStore = await cookies()

  cookieStore.set('age_check_done', '1', {
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
