import type { ImageLoaderProps } from 'next/image'

// imageURL.list の基準アスペクト比（184:250）
const H_PER_W = 250 / 184

// awsimgsrc.dmm.co.jp はクエリパラメータでオンデマンドリサイズに対応。
// pics.dmm.co.jp など非対応 CDN はそのまま返す。
export default function dmmImageLoader({ src, width }: ImageLoaderProps): string {
  try {
    const url = new URL(src)
    if (url.hostname === 'awsimgsrc.dmm.co.jp') {
      url.searchParams.set('w', String(width))
      url.searchParams.set('h', String(Math.round(width * H_PER_W)))
      url.searchParams.set('t', 'margin')
      return url.toString()
    }
  } catch {
    // URL パースエラーはそのまま返す
  }
  return src
}
