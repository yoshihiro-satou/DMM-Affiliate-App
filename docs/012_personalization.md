# 012 パーソナライズ・レコメンド

## 概要
スワイプ履歴・お気に入りからユーザーの嗜好スコアを計算し、「あなたへのおすすめ」フィードを生成する。協調フィルタ＋コンテンツベースのハイブリッド推薦。

## 依存
- 001 Supabase 初期設定
- 007 お気に入り
- 009 スワイプフィード

## 実装済み（2026-05-15）

### 嗜好スコア計算
- [x] `lib/personalization.ts` 作成（既存ファイルを全面刷新）
  - [x] `buildUserProfile(userId)`: Supabase からスワイプ履歴（50件）・お気に入り（20件）を取得し、ジャンル・女優・メーカーのスコアを集計
    - [x] 右スワイプ/お気に入り = +2点、左スワイプ = -1点
    - [x] DMM API で上位 8 件のアイテム詳細を取得（Next.js データキャッシュで 3600 秒キャッシュ）
    - [x] `actressNames: Map<number, string>` を収集（DMM API レスポンスの `actress.name` を保持）
  - [x] `scoreItem(item, userProfile)`: 商品とプロフィールの親和性スコアを計算（ジャンル/女優/メーカーの重み付き合計）
  - [x] `topEntries(scores, n)`: スコアマップから上位 N 件を抽出

### レコメンドAPI
- [x] `app/api/recommend/route.ts` 作成
  - [x] ログイン済み: Supabase の既見 IDs で候補をフィルタ → スコア降順で返す
  - [x] 追加セクション: トップジャンルの急上昇作品・トップ女優の新作を並列フェッチ
  - [x] 「前回の続き」: `view_history` の最終閲覧アイテムを含む
  - [x] ゲスト: LocalStorage の `?seen=id1,id2,...` クエリで既見除外し人気作を返す
- [x] `app/api/view/route.ts` 作成（POST）: 閲覧履歴を `view_history` に upsert

### UI
- [x] `components/recommend/ForYouFeed.tsx` 作成
  - [x] `ForYouFeed`: SWR でクライアントフェッチ（dedupingInterval: 5分）
  - [x] 「前回の続き」コンパクトカード（`view_history` から取得）
  - [x] 「あなたへのおすすめ」メイングリッド
  - [x] 「あなたの好みジャンルの急上昇」横スクロールカルーセル
  - [x] 「最近ハマっている女優の新作」横スクロールカルーセル
  - [x] `ForYouSkeleton`: ローディングスケルトン
  - [x] カード click で `/api/view` に fire-and-forget 送信
- [x] `components/recommend/ForYouFeedWrapper.tsx`: `ssr: false` の dynamic import を Client Component でラップ
- [x] `app/page.tsx`: ホームページに ForYouFeed セクションを追加（新着作品の下）

### 閲覧履歴・継続体験
- [x] Supabase `view_history` テーブル追加（user_id, item_id, item_title, affiliate_url, image_url, viewed_at）
- [x] RLS 設定（本人のみ読み書き可）
- [x] 「前回の続き」セクション: ForYouFeed 内に表示（view_history の最新 1 件）

### マイページ：閲覧傾向グラフ
- [x] `app/mypage/page.tsx` に統計セクション追加
  - [x] アクティビティカード: いいね数・スキップ数・お気に入り数・フォロー中シリーズ数
  - [x] 直近14日の閲覧数推移（CSS バーチャート）
  - [x] よく見る女優 TOP5（`buildUserProfile` 使用、Suspense でストリーミング）
- [x] `app/mypage/_components/OshiActressSetting.tsx` 作成（推し女優設定）
  - [x] DMM ActressSearch で実在女優を検索→選択（400ms デバウンス）
  - [x] `profiles.oshi_actress_id` / `oshi_actress_name` に保存
  - [x] ACTIVITY セクションの上に配置（マイページ全幅）
  - [x] `app/mypage/actions.ts` に `setOshiActress` / `clearOshiActress` Server Action 追加

## ファイル構成

```
lib/personalization.ts                                 ← 全面刷新
app/api/recommend/route.ts                             ← 新規
app/api/view/route.ts                                  ← 新規
components/recommend/ForYouFeed.tsx                    ← 新規
components/recommend/ForYouFeedWrapper.tsx             ← 新規（ssr:false ラッパー）
app/page.tsx                                           ← ForYouFeed 追加
app/mypage/page.tsx                                    ← 統計セクション・推し女優設定追加
app/mypage/_components/OshiActressSetting.tsx          ← 新規（推し女優設定 UI）
app/mypage/actions.ts                                  ← setOshiActress / clearOshiActress 追加
types/supabase.ts                                      ← view_history / oshi_actress 列追加
```

## アーキテクチャ補足

### プロフィール構築の流れ
1. `swipe_history`（最新50件）+ `favorites`（最新20件）から seen IDs を構築
2. 右スワイプ上位5件 + お気に入り上位5件（重複除去、最大8件）を DMM API で取得
3. 取得アイテムのジャンル/女優/メーカーをスコア集計
4. seenItemIds と genreScores/actressScores/makerScores を返す

### ゲストのレコメンド
- LocalStorage (`guest_swipe_history`) から seen IDs を読み取り
- `?seen=id1,id2,...`（最大20件）としてクエリに付与
- サーバー側で人気作品プールから既見を除外して返す

### なぜ `ForYouFeedWrapper` が必要か
Next.js App Router では `ssr: false` の `dynamic()` は Server Component 内では使えない。
Client Component にラップすることで Server Component の ISR を維持したまま遅延ロードが可能。

## 制限・既知の挙動
- プロフィール構築は DMM API を最大 8 回呼ぶため、初回リクエストは ~2-5 秒かかる
  - Next.js データキャッシュ（3600 秒）により 2 回目以降は高速
- 「よく見る女優 TOP5」は女優 ID のみ表示（女優名取得は actress ページリンクで代替）
- ゲストの seen ID は URL クエリ上限の関係で最大 20 件
- DMM ActressSearch は `site` / `sort` / `offset` パラメータ非対応（送ると 400 エラー）。`lib/dmm/client.ts` の `fetchActressList` ではこれらのパラメータを除外済み

## 追加（2026-06）: VR除外
- [x] `app/api/recommend/route.ts` の全候補（ゲスト/ログインのスコア対象・トップジャンル・トップ女優）に `isVrItem` 除外を追加。ホームの「あなたへのおすすめ」から VR 作品を表示しない
