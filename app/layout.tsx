import type { Metadata, Viewport } from 'next'
import { M_PLUS_Rounded_1c, Geist_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { AuthListener } from '@/components/auth-listener'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthProvider } from '@/components/providers/auth-provider'
import { getCurrentUser } from '@/lib/supabase/server'
import './globals.css'

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'FANZA おすすめ',
    template: '%s | FANZA おすすめ',
  },
  description: 'FANZAのセール・ランキング・お気に入り管理アプリ',
  applicationName: 'FANZA おすすめ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  return (
    <html
      lang="ja"
      className={`${mPlusRounded.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#080808] text-white">
        {/* ゲストお気に入り件数をハイドレーション前にバッジへ反映 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=JSON.parse(localStorage.getItem('guest_favorites')||'[]').length;if(n>0){var el=document.getElementById('fav-badge');if(el)el.textContent=n}}catch(e){}})()`,
          }}
        />
        <NuqsAdapter>
          <AuthProvider isLoggedIn={!!user} userId={user?.sub ?? null}>
            <AuthListener />
            {children}
            <BottomNav />
          </AuthProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
