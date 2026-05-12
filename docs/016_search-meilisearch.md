# 016 MeiliSearch 全文検索

## 概要
日本語タイポ補正に強い MeiliSearch で作品・女優の全文検索を実装。URLクエリパラメータで絞り込み状態を管理しブラウザバックに対応する。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## TODO

### MeiliSearch セットアップ
- [ ] MeiliSearch Cloud または self-host（VPS）でインスタンス作成
- [ ] `.env.local` に `MEILISEARCH_HOST` / `MEILISEARCH_ADMIN_KEY` / `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY` を追加
- [ ] `pnpm add meilisearch` でクライアントライブラリをインストール

### インデックス設計
- [ ] `items` インデックス作成
  - [ ] 検索可能フィールド: `title` / `actress` / `genre` / `maker` / `series`
  - [ ] フィルタ可能フィールド: `genre` / `price` / `review_average` / `floor`
  - [ ] ソート可能フィールド: `price` / `review_average` / `date`
  - [ ] 日本語トークナイザー設定（MeiliSearch のデフォルトで日本語対応）
- [ ] `actresses` インデックス作成
  - [ ] 検索可能フィールド: `name` / `ruby`
  - [ ] フィルタ可能フィールド: `bust` / `waist` / `hip` / `height`

### データ同期
- [ ] `scripts/seed-meilisearch.ts` 作成
  - [ ] DMM API から全商品・女優データを取得して MeiliSearch にバルクインポート
- [ ] Cloudflare Workers cron で差分更新（新着作品を毎時追加）

### 検索ページ
- [ ] `app/search/page.tsx` 作成（`force-dynamic`）
- [ ] `components/search/SearchInput.tsx` 作成（Client Component）
  - [ ] `nuqs` で `q` / `genre` / `sort` を URL クエリパラメータで管理
  - [ ] デバウンス（300ms）でリアルタイム検索
  - [ ] `useTransition` でローディング状態を管理（入力レスポンスを維持）
- [ ] `components/search/SearchFilters.tsx` 作成
  - [ ] ジャンル / 価格帯 / 評価 / フロア のファセットフィルター
- [ ] `components/search/SearchResults.tsx` 作成
  - [ ] 結果グリッド・スケルトンUI
  - [ ] 「○件見つかりました」件数表示

### Route Handler
- [ ] `app/api/search/route.ts` 作成
  - [ ] `MEILISEARCH_SEARCH_KEY`（公開可能な検索専用キー）を使いサーバー経由で検索
  - [ ] Zod でクエリパラメータを検証
