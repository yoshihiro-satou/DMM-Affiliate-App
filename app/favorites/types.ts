/** お気に入り一覧で表示・並び替えに使う、価格情報付きの正規化データ */
export type EnrichedFavorite = {
  id: string
  itemId: string
  title: string | null
  url: string
  imageUrl: string | null
  /** 保存時の価格 */
  savedPrice: number | null
  /** 現在価格（price_history の最新。無ければ null） */
  currentPrice: number | null
  /** 現在の割引率（%・セール中判定用） */
  currentDiscount: number | null
  /** 保存時からの値下げ額（円・0なら値下げなし） */
  dropSinceSaved: number
  createdAt: string
}
