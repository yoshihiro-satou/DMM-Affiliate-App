# 009 スワイプフィード

## 概要
TikTok風の1画面1作品縦スクロールフィード。サンプル動画を自動再生し、スワイプでお気に入り/スキップを判定。スワイプ履歴を学習してパーソナライズ推薦につなげる。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト
- 007 お気に入り

## TODO

### ページ・コンポーネント
- [x] `app/discover/page.tsx` 作成（Server Component、データ取得後 `SwipeFeedClient` へ渡す）
- [x] `app/discover/SwipeFeedClient.tsx` 作成（`'use client'`）
  - `next/dynamic` + `ssr: false` はここで定義（Server Component 内では `ssr: false` 不可のため分離）
- [x] `components/swipe/SwipeFeed.tsx` 作成（Client Component）
  - [x] 初期20件を API から取得、スクロール末尾で追加20件をフェッチ
  - [x] スワイプ判定: `pointerdown` → `pointermove` で X方向の移動量が50px超で確定
  - [x] 右スワイプ = お気に入り追加（FavoriteButton と同じ処理）
  - [x] 左スワイプ = スキップ
  - [x] 上スワイプ = 詳細ページへ遷移
  - [x] `motion` でカードの傾き・色変化アニメーション
  - [x] `navigator.vibrate(10)` で軽い振動フィードバック（Android）

### 動画プレイヤー
- [x] `components/swipe/SampleVideoPlayer.tsx` 作成
  - [x] `sampleMovieURL.size_476_306` を使用
  - [x] `IntersectionObserver` で画面内に入ったら自動再生、離れたら停止
  - [x] `loop` + `muted` + `playsInline` を必ず設定
  - [x] 動画なし作品は `sampleImageURL` のスライドショー表示

### スワイプ履歴の保存
- [x] `actions/swipe.ts` 作成
  - [x] `recordSwipe(itemId, direction)`: ログイン済みは Supabase、ゲストは LocalStorage に保存
  - [x] ゲストが10枚スワイプしたらログイン促進バナーを表示

### スティッキーCTA
- [x] 画面下部に「FANZAで見る」ボタンをスティッキー固定
  - [x] タップ領域 44×44px 以上
  - [x] ボトムナビと重ならないよう `bottom` 値を調整

### パーソナライズとの連携
- [x] スワイプ履歴をジャンル・女優スコアに変換する関数を `lib/personalization.ts` に追加（011 で利用）
