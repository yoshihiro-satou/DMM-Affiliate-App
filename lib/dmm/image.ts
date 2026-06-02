/**
 * DMM のパッケージ画像URLのサイズ変換ユーティリティ。
 *
 * DMM の画像は同一ジャケットを 3 サイズで提供する（末尾サフィックスのみ異なる）:
 *   - `...pt.jpg` … list（極小サムネ・約100px）
 *   - `...ps.jpg` … small（小・約150px）
 *   - `...pl.jpg` … large（大・約800px）
 *
 * お気に入りに小サイズ（pt/ps）が保存されていると一覧で引き伸ばされて荒く見えるため、
 * 表示・保存時に大サイズ（pl）へ正規化する。アスペクト比は 3 サイズ共通。
 */
export function toLargeDmmImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null
  // 末尾の pt.jpg / ps.jpg（任意のクエリ付き）を pl.jpg へ。pl は冪等。
  return url.replace(/p[ts](\.jpg)(\?.*)?$/i, 'pl$1$2')
}
