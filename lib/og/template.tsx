import 'server-only'
import type { ReactElement } from 'react'

export const OG_SIZE = { width: 1200, height: 630 }

type OgCardProps = {
  /** 大見出し（女優名・ページ名など）。日本語可。 */
  heading: string
  /** 補助行（作品数・説明など）。 */
  sub?: string
  /** 右上などに出す強調ピル（例: 最大90%OFF）。 */
  badge?: string
  /** 見出しのフォントサイズ（長い名前は小さく） */
  headingSize?: number
}

/**
 * 動的OGP共通テンプレート（追加21）。
 * DMM公式画像は改変不可のため、テキスト主体のブランドデザインで生成する。
 * Satori 制約：複数子を持つ要素には display:flex を明示する。
 */
export function OgCard({ heading, sub, badge, headingSize = 76 }: OgCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background:
          'linear-gradient(135deg, #3b1060 0%, #5a1a8a 45%, #7b2fbe 70%, #3b1060 100%)',
        color: '#ffffff',
        fontFamily: 'JP, sans-serif',
      }}
    >
      {/* ヘッダー行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#fde68a',
            }}
          >
            FANZA PICKS
          </div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            FANZAピックス
          </div>
        </div>
        {badge ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#e11d48',
              color: '#ffffff',
              fontSize: 34,
              fontWeight: 800,
              padding: '12px 28px',
              borderRadius: 999,
            }}
          >
            {badge}
          </div>
        ) : (
          <div style={{ display: 'flex' }} />
        )}
      </div>

      {/* 見出し */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: headingSize,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: 1,
            whiteSpace: 'pre-line',
          }}
        >
          {heading}
        </div>
        {sub ? (
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 18,
            }}
          >
            {sub}
          </div>
        ) : (
          <div style={{ display: 'flex' }} />
        )}
      </div>

      {/* フッター行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.65)' }}>
          セール · ランキング · 推し通知
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>
          fanzapicks.com
        </div>
      </div>
    </div>
  )
}
