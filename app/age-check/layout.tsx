/**
 * age-check 専用レイアウト
 * - M PLUS Rounded 1c（重い日本語フォント）を読み込まない
 * - GA4 スクリプトを読み込まない（noindex ページなので計測不要）
 * - BottomNav・DmmCredit を表示しない
 * → FCP / LCP の大幅改善が見込める
 */
import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function AgeCheckLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="h-full dark">
      <body
        className="flex min-h-full flex-col text-white antialiased"
        style={{
          background:
            'linear-gradient(135deg, #3b1060 0%, #5a1a8a 25%, #7b2fbe 50%, #5a1a8a 75%, #3b1060 100%)',
          backgroundAttachment: 'fixed',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
