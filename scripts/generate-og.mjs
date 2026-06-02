/**
 * OGP 画像生成スクリプト
 * 実行: node scripts/generate-og.mjs
 * 出力: public/og/default.png (1200x630)
 */
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/noto-sans-jp/files')

// 新アイコン（ロゴマーク）を data URI で読み込み、OGにも同じFマークでブランドＦを統一
const LOGO_DATA_URI =
  'data:image/png;base64,' +
  readFileSync(join(ROOT, 'public/icons/icon-512.png')).toString('base64')

// satori は同名フォントが複数あると最初の1つしか使わないため、
// サブセットごとに別のファミリー名を付けてフォールバックスタックを構築する
const JP_SUBSETS = ['101','105','107','111','114','116','117','118','119']
const FONT_FAMILY = ['"Latin"', ...JP_SUBSETS.map(n => `"JP${n}"`)].join(', ')

const fonts = [
  {
    name: 'Latin',
    data: readFileSync(join(FONT_DIR, 'noto-sans-jp-latin-700-normal.woff')),
    weight: 700,
    style: 'normal',
  },
  ...JP_SUBSETS.map(n => ({
    name: `JP${n}`,
    data: readFileSync(join(FONT_DIR, `noto-sans-jp-${n}-700-normal.woff`)),
    weight: 700,
    style: 'normal',
  })),
]

console.log(`フォント ${fonts.length} ファイル、フォールバックスタック: ${FONT_FAMILY}`)

const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '80px 100px',
        backgroundColor: '#3b1060',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      },
      children: [
        // 背景グラデーション代わりの重ね矩形
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', inset: '0',
              background: 'linear-gradient(135deg, #3b1060 0%, #5a1a8a 35%, #7b2fbe 65%, #3b1060 100%)',
            },
          },
        },
        // 右上の光彩
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', right: '-80px', top: '-80px',
              width: '480px', height: '480px', borderRadius: '50%',
              backgroundColor: 'rgba(251,113,133,0.18)',
            },
          },
        },
        // ロゴマーク（右側中央）— アイコンとブランドを統一
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', right: '90px', top: '195px',
              width: '240px', height: '240px', borderRadius: '56px',
              display: 'flex', overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            },
            children: [
              {
                type: 'img',
                props: { src: LOGO_DATA_URI, width: 240, height: 240 },
              },
            ],
          },
        },
        // 左下の光彩
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', left: '-60px', bottom: '-60px',
              width: '360px', height: '360px', borderRadius: '50%',
              backgroundColor: 'rgba(168,85,247,0.18)',
            },
          },
        },
        // 上部アクセントライン
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: '0', left: '0', right: '0', height: '5px',
              background: 'linear-gradient(90deg, #f59e0b, #fda4af, transparent)',
            },
          },
        },
        // コンテンツ（z-indexのため別divに）
        {
          type: 'div',
          props: {
            style: {
              position: 'relative', display: 'flex', flexDirection: 'column',
              gap: '0px',
            },
            children: [
              // サブタイトル
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px', fontWeight: 700,
                    color: 'rgba(253,164,175,0.8)',
                    letterSpacing: '0.3em', marginBottom: '20px',
                    fontFamily: FONT_FAMILY,
                  },
                  children: 'FANZA PICKS',
                },
              },
              // メインタイトル
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '96px', fontWeight: 700,
                    color: 'white', lineHeight: '1',
                    letterSpacing: '-0.02em', marginBottom: '32px',
                    fontFamily: FONT_FAMILY,
                  },
                  children: 'FANZAピックス',
                },
              },
              // キャッチフレーズ
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '30px', color: 'rgba(255,255,255,0.6)',
                    fontWeight: 700, lineHeight: '1.5', marginBottom: '40px',
                    fontFamily: FONT_FAMILY,
                  },
                  children: 'セール・ランキング・推し女優をアプリ感覚で',
                },
              },
              // タグ群
              {
                type: 'div',
                props: {
                  style: { display: 'flex', gap: '16px' },
                  children: ['セール情報', 'ランキング', '値下げ通知', 'お気に入り'].map(tag => ({
                    type: 'div',
                    props: {
                      style: {
                        padding: '8px 22px', borderRadius: '999px',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: '22px', fontWeight: 700,
                        fontFamily: FONT_FAMILY,
                      },
                      children: tag,
                    },
                  })),
                },
              },
            ],
          },
        },
        // URL（右下）
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', bottom: '48px', right: '80px',
              fontSize: '22px', color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.05em', fontFamily: FONT_FAMILY,
            },
            children: 'fanzapicks.com',
          },
        },
      ],
    },
  },
  { width: 1200, height: 630, fonts }
)

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
const png = resvg.render().asPng()

mkdirSync(join(ROOT, 'public', 'og'), { recursive: true })
writeFileSync(join(ROOT, 'public', 'og', 'default.png'), png)
console.log('✅ public/og/default.png を生成しました (1200x630)')
