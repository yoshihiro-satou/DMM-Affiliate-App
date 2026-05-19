import { redirect } from 'next/navigation'

// マジックリンク廃止により /login にリダイレクト
export default function LoginSentPage() {
  redirect('/login')
}
