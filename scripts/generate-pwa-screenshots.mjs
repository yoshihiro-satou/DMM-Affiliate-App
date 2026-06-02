/**
 * PWA インストールダイアログ用スクリーンショット生成
 * 実行: node scripts/generate-pwa-screenshots.mjs
 * 出力: public/screenshots/mobile-1.png / mobile-2.png (1080x1920)
 */
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/noto-sans-jp/files')

// 全サブセットを読み込み、どの漢字でも豆腐(▢)にならないようにする。
// satori は同名フォントが複数あると最初の1つしか使わないため、ファイルごとに別名を付ける。
const subsetFiles = readdirSync(FONT_DIR).filter(
  (f) => f.endsWith('-700-normal.woff') && !f.includes('latin'),
)
const fonts = [
  { name: 'Latin', data: readFileSync(join(FONT_DIR, 'noto-sans-jp-latin-700-normal.woff')), weight: 700, style: 'normal' },
  ...subsetFiles.map((f, i) => ({ name: `JP${i}`, data: readFileSync(join(FONT_DIR, f)), weight: 700, style: 'normal' })),
]
const FONT_FAMILY = ['"Latin"', ...subsetFiles.map((_, i) => `"JP${i}"`)].join(', ')

const LOGO = 'data:image/png;base64,' + readFileSync(join(ROOT, 'public/icons/icon-512.png')).toString('base64')

const W = 1080
const H = 1920

const baseBg = (children) => ({
  type: 'div',
  props: {
    style: {
      width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column',
      alignItems: 'center', backgroundColor: '#3b1060', position: 'relative',
      overflow: 'hidden', fontFamily: FONT_FAMILY,
    },
    children: [
      { type: 'div', props: { style: { position: 'absolute', inset: '0', background: 'linear-gradient(160deg, #3b1060 0%, #5a1a8a 40%, #7b2fbe 70%, #3b1060 100%)' } } },
      { type: 'div', props: { style: { position: 'absolute', right: '-160px', top: '-120px', width: '640px', height: '640px', borderRadius: '50%', backgroundColor: 'rgba(251,113,133,0.16)' } } },
      { type: 'div', props: { style: { position: 'absolute', left: '-140px', bottom: '160px', width: '520px', height: '520px', borderRadius: '50%', backgroundColor: 'rgba(168,85,247,0.16)' } } },
      ...children,
    ],
  },
})

const text = (s, style) => ({ type: 'div', props: { style: { fontFamily: FONT_FAMILY, ...style }, children: s } })

// 1枚目: ヒーロー
const hero = baseBg([
  {
    type: 'div',
    props: {
      style: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '430px', gap: '0px' },
      children: [
        { type: 'div', props: { style: { display: 'flex', width: '320px', height: '320px', borderRadius: '76px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }, children: [{ type: 'img', props: { src: LOGO, width: 320, height: 320 } }] } },
        text('FANZAピックス', { fontSize: '92px', color: 'white', fontWeight: 700, marginTop: '72px', letterSpacing: '-0.02em' }),
        text('セール・ランキング・推し女優を', { fontSize: '40px', color: 'rgba(255,255,255,0.72)', marginTop: '40px' }),
        text('ぜんぶアプリ感覚で', { fontSize: '40px', color: 'rgba(255,255,255,0.72)', marginTop: '8px' }),
      ],
    },
  },
])

// 2枚目: 機能リスト
const features = [
  ['🔥', 'セール・ランキング', '90%OFFや独自スコアの人気順'],
  ['💜', '推し女優を登録', '新作・値下げを日替わり通知'],
  ['👆', 'スワイプで発見', '好みを学習してパーソナライズ'],
  ['🔔', '値下げ通知', 'お気に入りが安くなったら即お知らせ'],
]
const featureScreen = baseBg([
  {
    type: 'div',
    props: {
      style: { position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', paddingLeft: '90px', paddingRight: '90px', marginTop: '240px' },
      children: [
        text('できること', { fontSize: '72px', color: 'white', fontWeight: 700, marginBottom: '80px' }),
        ...features.map(([, title, desc]) => ({
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.14)', borderRadius: '40px', padding: '48px 52px', marginBottom: '44px' },
            children: [
              text(title, { fontSize: '52px', color: 'white', fontWeight: 700, marginBottom: '20px' }),
              text(desc, { fontSize: '34px', color: 'rgba(255,255,255,0.65)' }),
            ],
          },
        })),
      ],
    },
  },
])

async function build(tree, out) {
  const svg = await satori(tree, { width: W, height: H, fonts })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
  mkdirSync(join(ROOT, 'public', 'screenshots'), { recursive: true })
  writeFileSync(join(ROOT, 'public', 'screenshots', out), png)
  console.log(`✅ public/screenshots/${out} (${W}x${H})`)
}

await build(hero, 'mobile-1.png')
await build(featureScreen, 'mobile-2.png')
