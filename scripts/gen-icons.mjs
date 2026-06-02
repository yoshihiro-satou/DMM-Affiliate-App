// SVGソースから各種PNGアイコンを生成する。
// 実行: node scripts/gen-icons.mjs
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const anySvg = readFileSync(resolve(root, 'scripts/icon-src/icon-any.svg'))
const maskSvg = readFileSync(resolve(root, 'scripts/icon-src/icon-maskable.svg'))
const badgeSvg = readFileSync(resolve(root, 'scripts/icon-src/badge.svg'))

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()

const jobs = [
  // 通常用（any）: Android任意・iOS apple-touch
  [anySvg, 192, 'public/icons/icon-192.png'],
  [anySvg, 512, 'public/icons/icon-512.png'],
  [anySvg, 180, 'app/apple-icon.png'], // iOSホーム画面（角丸はOS側）
  // maskable用: 中央80%セーフゾーン
  [maskSvg, 192, 'public/icons/icon-192-maskable.png'],
  [maskSvg, 512, 'public/icons/icon-512-maskable.png'],
  // 通知バッジ（Android）: 白単色シルエット
  [badgeSvg, 96, 'public/icons/notification-badge.png'],
]

for (const [svg, size, out] of jobs) {
  const abs = resolve(root, out)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, render(svg, size))
  console.log(`✓ ${out} (${size}px)`)
}

// favicon.ico を新デザインで再生成（PNG埋め込み型ICO・48px）。
// 旧来の /favicon.ico リクエスト向け。モダンブラウザは app/icon.svg を優先。
const icoPng = render(anySvg, 48)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // image count
const entry = Buffer.alloc(16)
entry.writeUInt8(48, 0) // width
entry.writeUInt8(48, 1) // height
entry.writeUInt8(0, 2) // color palette
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(icoPng.length, 8) // image data size
entry.writeUInt32LE(6 + 16, 12) // offset to image data
const ico = Buffer.concat([header, entry, icoPng])
writeFileSync(resolve(root, 'app/favicon.ico'), ico)
console.log('✓ app/favicon.ico (48px)')
