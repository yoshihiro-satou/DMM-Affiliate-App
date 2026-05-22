import { ImageResponse } from 'next/og'

export const alt = 'おしランク'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #2d0a4e 0%, #4a1070 40%, #6b22a8 70%, #2d0a4e 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* 上部アクセントライン */}
      <div style={{ position: 'absolute', top: 72, left: 80, right: 80, height: 1, background: 'rgba(185, 28, 28, 0.7)', display: 'flex' }} />

      {/* ラベル */}
      <div style={{ color: 'rgba(167, 139, 250, 0.85)', fontSize: 20, letterSpacing: '0.35em', fontWeight: 600, marginBottom: 28, display: 'flex' }}>
        OSHI RANK
      </div>

      {/* メインタイトル */}
      <div style={{ color: '#ffffff', fontSize: 96, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 24, display: 'flex' }}>
        おしランク
      </div>

      {/* サブタイトル */}
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 30, letterSpacing: '0.08em', display: 'flex' }}>
        推し女優&nbsp;·&nbsp;セール&nbsp;·&nbsp;ランキング
      </div>

      {/* 下部アクセントライン */}
      <div style={{ position: 'absolute', bottom: 72, left: 80, right: 80, height: 1, background: 'rgba(185, 28, 28, 0.7)', display: 'flex' }} />

      {/* PR注記 */}
      <div style={{ position: 'absolute', bottom: 36, right: 80, color: 'rgba(255,255,255,0.2)', fontSize: 15, display: 'flex' }}>
        PR · FANZAアフィリエイトリンク
      </div>
    </div>,
    size,
  )
}
