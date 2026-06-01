/** 現在の JST 日付を「2026年6月1日」形式で返す（SEO のフレッシュネス表示用）。 */
export function todayJstLabel(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`
}
