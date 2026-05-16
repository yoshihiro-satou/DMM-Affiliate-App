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
- [x] 「FANZAで全作品を見る →」リンクボタン（`actress.listURL?.digital` を使用）
  - `flex items-center justify-between` レイアウト内に PR表記と並列配置
  - スタイル: `border border-red-700/50 text-red-400 rounded px-2.5 py-1 text-[11px] font-bold`
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
- [x] `components/actress/ActressCard.tsx` - 女優カード
  - 丸型画像（`aspect-square w-3/4 rounded-full object-cover object-top`）
  - 名前: `text-[15px] font-semibold`
  - サブ情報（カップ数・身長）: `text-[12px] text-white/50`
  - レイアウト: `flex flex-col items-center gap-3 text-center`
- [x] `app/actress/loading.tsx` - 一覧ページローディングスケルトン
- [x] `app/actress/[id]/loading.tsx` - 詳細ページローディングスケルトン

### Zodスキーマ（`types/dmm.ts`）
- [x] `DmmActressSchema` の全オプションフィールドを `.optional()` → `.nullish()` に変更
  - 対象: `ruby, bust, cup, waist, hip, height, birthday, blood_type, hobby, prefectures, imageURL, listURL`
  - 理由: ActressSearch API が null を返すケースがあるため
- [x] `DmmActressResponseSchema` の数値フィールドを `z.coerce.number()` に変更
  - 対象: `status, result_count, total_count, first_position`
  - 理由: API が数値を文字列として返すケースがあるため

### next.config.ts（画像ホスト）
- [x] `remotePatterns` に `http://pics.dmm.co.jp` と `http://pics.dmm.com` を追加
  - 理由: 女優画像が `http://` プロトコルで配信されるケースがあるため（`https://` のみでは `next/image` がエラー）
  - 現在登録済みホスト: `pics.dmm.co.jp`（http/https）/ `pics.dmm.com`（http/https）/ `awsimgsrc.dmm.co.jp`（https）

### AI自然言語検索（将来対応・下準備）
- [ ] `app/api/actress/search/route.ts` のエンドポイントを用意（実装は後続チケット）
