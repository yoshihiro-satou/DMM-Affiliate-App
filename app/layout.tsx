import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { M_PLUS_Rounded_1c, Geist_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { AuthListener } from '@/components/auth-listener'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { NavigationProgress } from '@/components/layout/NavigationProgress'
import { DmmCredit } from '@/components/layout/DmmCredit'
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FANZAピックス',
    template: '%s | FANZAピックス',
  },
  description: 'FANZAのセール・ランキング・推し女優を管理するアプリ。スワイプで作品発見、値下げ通知、お気に入り管理。',
  applicationName: 'FANZAピックス',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'FANZAピックス',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yoshihirock0710',
    creator: '@yoshihirock0710',
  },
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
      <body
        className="flex min-h-full flex-col text-white"
        style={{
          background:
            'linear-gradient(135deg, #3b1060 0%, #5a1a8a 25%, #7b2fbe 50%, #5a1a8a 75%, #3b1060 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FANZAピックス',
              url: SITE_URL,
              description: 'FANZAのセール・ランキング・お気に入り管理アプリ',
              potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* ゲストお気に入り件数をハイドレーション前にバッジへ反映 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=JSON.parse(localStorage.getItem('guest_favorites')||'[]').length;if(n>0){var el=document.getElementById('fav-badge');if(el)el.textContent=n}}catch(e){}})()`,
          }}
        />
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <NuqsAdapter>
          <AuthProvider isLoggedIn={!!user} userId={user?.sub ?? null}>
            <AuthListener />
            <ServiceWorkerRegistration />
            {children}
            <DmmCredit />
            <BottomNav />
          </AuthProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
