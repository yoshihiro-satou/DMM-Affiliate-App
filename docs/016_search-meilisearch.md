# 016 検索

## 概要
DMM API のキーワード検索を使った全文検索を実装。外部サービス不要・追加費用ゼロで動作する。URLクエリパラメータで絞り込み状態を管理しブラウザバックに対応する。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## 実装済み（2026-05-15）

### ファイル構成

```
lib/search.ts                         ← 新規（DMM API 検索ラッパー）
app/api/search/route.ts               ← 新規（Route Handler・Zod バリデーション）
app/search/page.tsx                   ← 新規（force-dynamic）
components/search/searchParsers.ts    ← 新規（nuqs パーサー定数・ソートオプション）
components/search/SearchInput.tsx     ← 新規（デバウンス 300ms・useTransition）
components/search/SearchFilters.tsx   ← 新規（ソートフィルター pills）
components/search/SearchResults.tsx   ← 新規（SWR・スケルトン UI）
```

### lib/search.ts
- `searchItems()`: DMM API の `ItemList` エンドポイントを使ってキーワード検索
  - キーワードあり → `sort=match`（キーワードマッチング順）
  - キーワードなし → 指定ソート順でブラウズ
- `SearchResultItem` 型: UI 統一型
- `SearchSort`: `rank` / `date` / `-price` / `price` / `review`

### app/api/search/route.ts
- `GET /api/search?q=&sort=rank&page=1&hits=20`
- Zod でクエリパラメータをバリデーション（q: max 100文字、hits: 1〜40）
- Cache-Control: `s-maxage=300, stale-while-revalidate=3600`（同一クエリは 5分キャッシュ）

### 検索ページ / コンポーネント
- `SearchInput`: `nuqs` の `useQueryState` で `q` を URL パラメータ管理、300ms デバウンスで入力ごとに不要なリクエストを抑制。`useTransition` でキーストローク中も UI レスポンスを維持
- `SearchFilters`: ソートを pill ボタンで切り替え（人気順 / 新着順 / 評価順 / 価格安順 / 価格高順）
- `SearchResults`: `useSWR` でクライアントフェッチ、`keepPreviousData` で検索中もコンテンツ維持、スケルトン 12枚

## アーキテクチャ補足

### 検索フロー
```
ユーザー入力（300ms デバウンス）
  → URL パラメータ更新（nuqs）
  → SWR が /api/search を再フェッチ
  → Route Handler で Zod バリデーション
  → searchItems() が DMM API /ItemList へリクエスト
  → 結果を SearchResponse 型に変換して返却
  → SearchResults がグリッドを再描画
```

### URL パラメータ管理（nuqs）
`useQueryState` を使用するため、クエリが変わるたびに URL が更新される。ブラウザバックで検索状態が復元される。
- `q`: 検索キーワード（空の場合は null）
- `sort`: ソート順（デフォルト: `rank`）

### DMM API キーワード検索の特性
- 日本語全文検索に対応（DMM API 側で処理）
- `sort=match` でキーワードマッチング順
- 1リクエスト最大 100件取得可能（`hits` パラメータ上限）
- タイポ補正は DMM API 側に依存（補正能力あり）

## テスト
- [ ] キーワード入力後 300ms で `/api/search?q=...` にリクエストが飛ぶことを確認
- [ ] URL の `q` パラメータが更新されることを確認
- [ ] ブラウザバックでキーワードが復元されることを確認
- [ ] ソートフィルターで並び替えが反映されることを確認
- [ ] 検索結果 0件のときに空状態 UI が表示されることを確認

## 制限・既知の挙動
- DMM API `keyword` パラメータは videoa フロアのみに絞っているため、同人・PCゲームは対象外
  - 対応する場合は `floor` パラメータを可変にするか、`service` を `all` に変更する
- 1ページ最大 20件（`hits=20`）。ページネーションは未実装（フェーズ 2 で追加予定）
- DMM API のレートリミットに注意（Cloudflare のキャッシュが 5分間同一クエリを再利用）
