# 009 スワイプフィード

## 概要
TikTok風の1画面1作品縦スクロールフィード。サンプル動画を自動再生し、スワイプでお気に入り/スキップを判定。スワイプ履歴を学習してパーソナライズ推薦につなげる。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト
- 007 お気に入り

## TODO

### ページ・コンポーネント
- [ ] `app/discover/page.tsx` 作成（`next/dynamic` で SwipeFeed を遅延ロード、`ssr: false`）
- [ ] `components/swipe/SwipeFeed.tsx` 作成（Client Component）
  - [ ] 初期20件を API から取得、スクロール末尾で追加20件をフェッチ
  - [ ] スワイプ判定: `pointerdown` → `pointermove` で X方向の移動量が50px超で確定
  - [ ] 右スワイプ = お気に入り追加（FavoriteButton と同じ処理）
  - [ ] 左スワイプ = スキップ
  - [ ] 上スワイプ = 詳細ページへ遷移
  - [ ] `motion` でカードの傾き・色変化アニメーション
  - [ ] `navigator.vibrate(10)` で軽い振動フィードバック（Android）

### 動画プレイヤー
- [ ] `components/swipe/SampleVideoPlayer.tsx` 作成
  - [ ] `sampleMovieURL.size_476_306` を使用
  - [ ] `IntersectionObserver` で画面内に入ったら自動再生、離れたら停止
  - [ ] `loop` + `muted` + `playsInline` を必ず設定
  - [ ] 動画なし作品は `sampleImageURL` のスライドショー表示

### スワイプ履歴の保存
- [ ] `actions/swipe.ts` 作成
  - [ ] `recordSwipe(itemId, direction)`: ログイン済みは Supabase、ゲストは LocalStorage に保存
  - [ ] ゲストが10枚スワイプしたらログイン促進バナーを表示

### スティッキーCTA
- [ ] 画面下部に「FANZAで見る」ボタンをスティッキー固定
  - [ ] タップ領域 44×44px 以上
  - [ ] ボトムナビと重ならないよう `bottom` 値を調整

### パーソナライズとの連携
- [ ] スワイプ履歴をジャンル・女優スコアに変換する関数を `lib/personalization.ts` に追加（011 で利用）
