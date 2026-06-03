import 'server-only'
import { ImageResponse } from 'next/og'
import { OgCard, OG_SIZE } from './template'
import { loadJpFont } from './font'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'
const CACHE = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'

type RenderArgs = {
  heading: string
  sub?: string
  badge?: string
  headingSize?: number
}

/**
 * OgCard を画像レスポンスとして描画する（追加21）。
 *
 * Noto Sans JP は Latin 字形も内包するため、見出し〜固定文言を含む全テキストから
 * サブセットを取得すれば1フォントで全文を描画できる。取得に失敗した場合は
 * 静的デフォルトOG（/og/default.png）へフォールバックする。これにより @vercel/og の
 * 既定フォント（一部ビルドで同梱漏れ）に依存せず、確実に有効な画像を返す。
 */
export async function renderOgImage(args: RenderArgs): Promise<Response> {
  const text = `${args.heading}${args.sub ?? ''}${args.badge ?? ''}セールランキング推し通知ピックス・%OFF本日最大更新女優おすすめ作品全本`
  const font = await loadJpFont(text)

  if (!font) {
    const buf = await fetch(`${SITE_URL}/og/default.png`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null)
    if (buf) {
      return new Response(buf, {
        headers: { 'content-type': 'image/png', 'cache-control': CACHE },
      })
    }
    // 最終手段：フォント無しで描画（@vercel/og 既定フォントが使える環境向け）
    return new ImageResponse(<OgCard {...args} />, { ...OG_SIZE, headers: { 'cache-control': CACHE } })
  }

  return new ImageResponse(<OgCard {...args} />, {
    ...OG_SIZE,
    fonts: [{ name: 'JP', data: font, weight: 800, style: 'normal' }],
    headers: { 'cache-control': CACHE },
  })
}
