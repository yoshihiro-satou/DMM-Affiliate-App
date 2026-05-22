import { ImageResponse } from 'next/og'

export const alt = 'ランキング | FANZA おすすめ'
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
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
        padding: '0 100px',
      }}
    >
      {/* 左アクセントバー */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', display: 'flex' }} />

      {/* サイト名 */}
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 22, letterSpacing: '0.25em', fontWeight: 600, marginBottom: 20, display: 'flex' }}>
        FANZA おすすめ
      </div>

      {/* ページタイトル */}
      <div style={{ color: '#ffffff', fontSize: 108, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 28, lineHeight: 1, display: 'flex' }}>
        ランキング
      </div>

      {/* 説明 */}
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 28, letterSpacing: '0.04em', display: 'flex' }}>
        人気作品・人気女優を日次・週次・月次で確認
      </div>

      {/* 右下ランキングアイコン */}
      <div style={{ position: 'absolute', right: 100, top: '50%', fontSize: 180, opacity: 0.08, display: 'flex', transform: 'translateY(-50%)' }}>
        🏆
      </div>

      {/* 下部ライン */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #dc2626 0%, transparent 100%)', display: 'flex' }} />
    </div>,
    size,
  )
}
