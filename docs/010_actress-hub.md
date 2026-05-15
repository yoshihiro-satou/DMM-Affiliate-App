# 010 女優・作品ハブ（SEO）

## 概要
女優ごとに全作品グリッドを統合した縦長ページを自動生成。AI自然言語検索・ロングテールSEOの柱。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## TODO

### ルーティング
- [x] `app/actress/page.tsx` - 女優一覧（nuqs ファセット検索付き）
- [x] `app/actress/[id]/page.tsx` - 女優詳細ページ
  - [x] `generateStaticParams`: 上位200人を事前生成（2バッチ×100件、`dynamicParams = true` で残りはオンデマンドISR）
  - [x] `dynamicParams = true`: それ以外はオンデマンドISR
  - [x] `generateMetadata`: 女優名・プロフィール画像でOGP生成

### 女優詳細ページ
- [x] プロフィールセクション（身長/バスト/ウエスト/ヒップ/生年月日 を表示）
- [x] タブUI（URL パラメータ連動）: 最新作 / 人気作
  - `app/actress/[id]/WorkTabs.tsx`（Client Component）
  - `?tab=latest`（デフォルト）/ `?tab=popular`
- [x] 作品グリッド（最大30件、GridCard 使用、BENTO_PATTERN で大小混在）
- [ ] 横スクロールカルーセル（各タブ内）← 将来対応
- [ ] サンプル動画のホバープレビュー（PC）/ タッププレビュー（モバイル）← 将来対応

### 女優一覧ページ
- [x] ファセット検索: キーワード / バスト / 身長（プリセットボタン）
- [x] `nuqs` で URL クエリパラメータとして絞り込み条件を管理（`useQueryStates`、`shallow: false` でサーバー再取得）
  - `app/actress/ActressFilters.tsx`（Client Component）
  - `app/layout.tsx` に `NuqsAdapter`（`nuqs/adapters/next/app`）を追加済み
- [x] `<Suspense>` で検索結果をストリーミング

### SEO
- [x] 構造化データ（JSON-LD）: `Person` スキーマで女優情報を出力
- [x] `app/sitemap.ts` に静的ルート＋女優ページURLを追加（`NEXT_PUBLIC_SITE_URL` 環境変数で BASE_URL 設定）
- [ ] 「女優名×ジャンル」のクロスページ: `app/actress/[id]/genre/[genre]/page.tsx` ← 将来対応
- [ ] `sitemap.ts` に商品ページURLを追加 ← 将来対応

### コンポーネント
- [x] `components/actress/ActressCard.tsx` - 女優カード（写真・名前・スリーサイズ・リンク）
- [x] `app/actress/loading.tsx` - 一覧ページローディングスケルトン
- [x] `app/actress/[id]/loading.tsx` - 詳細ページローディングスケルトン

### AI自然言語検索（将来対応・下準備）
- [ ] `app/api/actress/search/route.ts` のエンドポイントを用意（実装は後続チケット）
