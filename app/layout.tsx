import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthListener } from '@/components/auth-listener'
import { BottomNav } from '@/components/layout/BottomNav'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#080808] text-white">
        <AuthListener />
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
