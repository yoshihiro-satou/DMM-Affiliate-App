import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { M_PLUS_Rounded_1c, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { AuthListener } from '@/components/auth-listener'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { Tracker } from '@/components/Tracker'
import { NavigationProgress } from '@/components/layout/NavigationProgress'
import { DmmCredit } from '@/components/layout/DmmCredit'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { getCurrentUser } from '@/lib/supabase/server'
import { GA_ID } from '@/lib/analytics'
import { TELEGRAM_CHANNEL_URL } from '@/lib/constants/telegram'
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
  appleWebApp: {
    capable: true,
    title: 'FANZAピックス',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'FANZAピックス',
    images: [{ url: '/og/default.png', width: 1200, height: 630, alt: 'FANZAピックス' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yoshihirock0710',
    creator: '@yoshihirock0710',
    images: ['/og/default.png'],
  },
  verification: {
    google: 'd2702fb0af647cea',
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
              '@graph': [
                {
                  // 運営エンティティ。sameAs で公式SNSと結びつけ、ナレッジグラフ/LLM上の
                  // 一意な概念として確立する（GEO/E-E-A-T＝[[meeting-log]] 第10回）。
                  '@type': 'Organization',
                  '@id': `${SITE_URL}/#org`,
                  name: 'FANZAピックス',
                  url: SITE_URL,
                  description: 'FANZAのセール・ランキング・推し女優を管理するメディア。',
                  sameAs: ['https://x.com/yoshihirock0710', TELEGRAM_CHANNEL_URL],
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  name: 'FANZAピックス',
                  url: SITE_URL,
                  description: 'FANZAのセール・ランキング・お気に入り管理アプリ',
                  publisher: { '@id': `${SITE_URL}/#org` },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        {/* ゲストお気に入り件数をハイドレーション前にバッジへ反映 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var n=JSON.parse(localStorage.getItem('guest_favorites')||'[]').length;if(n>0){var el=document.getElementById('fav-badge');if(el)el.textContent=n}}catch(e){}})()`,
          }}
        />
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            // 管理画面(/admin/*)はオーナー専用のため計測から除外する。
            // IP内部トラフィック除外(GA4側)に加え、IP変動時の保険として page_view を送らない。
            var __isAdmin = window.location.pathname.indexOf('/admin') === 0;
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              send_page_view: !__isAdmin,
              ${user?.sub ? `user_id: '${user.sub}',` : ''}
            });
          `}
        </Script>
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <NuqsAdapter>
          <AuthProvider isLoggedIn={!!user} userId={user?.sub ?? null}>
            <AuthListener />
            <ServiceWorkerRegistration />
            <Tracker />
            {children}
            <SiteFooter />
            <DmmCredit />
            <BottomNav />
          </AuthProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
