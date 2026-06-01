import { getCurrentUser } from '@/lib/supabase/server'
import { WelcomeFlow } from './WelcomeFlow'

export const metadata = {
  title: 'ようこそ',
  robots: 'noindex,nofollow',
}

type Props = {
  searchParams: Promise<{ from?: string }>
}

export default async function WelcomePage({ searchParams }: Props) {
  const { from } = await searchParams
  const claims = await getCurrentUser()

  // オープンリダイレクト防止：サイト内パスのみ許容
  const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/'

  return <WelcomeFlow isLoggedIn={!!claims} dest={dest} />
}
