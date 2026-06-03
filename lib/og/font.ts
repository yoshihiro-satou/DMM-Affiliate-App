import 'server-only'

/**
 * 動的OGP（追加21）用の日本語フォント取得。
 * Satori（next/og）は woff2 を解釈できないため、Google Fonts の動的サブセット
 * （?text= で必要字形だけ）を旧UAで取得して TTF を得る。万一 woff2 等が返った
 * 場合は null を返し、呼び出し側は Latin フォント（デフォルト）でフォールバックする。
 */

// TTF/OTF のマジックナンバーのみ採用する（woff2 'wOF2' 等は弾く）
function isTtfOrOtf(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false
  const tag = new DataView(buf).getUint32(0)
  return (
    tag === 0x00010000 || // TrueType
    tag === 0x4f54544f || // 'OTTO' (CFF/OpenType)
    tag === 0x74727565 || // 'true'
    tag === 0x74746366 //   'ttcf'
  )
}

export async function loadJpFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@800&text=${encodeURIComponent(text)}`
    const css = await fetch(api, {
      headers: {
        // 旧UAだと Google が format('truetype') の URL を返す（Satori が読める）
        'User-Agent':
          'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.11) Gecko/2009060214 Firefox/3.0.11',
      },
    }).then((r) => r.text())

    const url =
      css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1] ??
      css.match(/url\((https:[^)]+\.(?:ttf|otf))\)/)?.[1]
    if (!url) return null

    const buf = await fetch(url).then((r) => r.arrayBuffer())
    return isTtfOrOtf(buf) ? buf : null
  } catch {
    return null
  }
}
