# 003 年齢確認ゲート

## 概要
FANZAコンテンツへのアクセス前に年齢確認を必須化する。`middleware.ts` で Cookie を確認し、未確認ユーザーを `/age-check` にリダイレクト。

## 依存
- 001 Supabase 初期設定（middleware で Supabase トークンリフレッシュと共存させる）

## TODO

### ページ
- [x] `app/age-check/page.tsx` 作成
  - [x] 「18歳以上です」「18歳未満です」の2択ボタン
  - [x] 18歳未満選択時は退場ページへ
  - [x] デザインはシンプル・モバイルファースト（全画面表示）

### middleware 連携
- [x] `middleware.ts` に年齢確認ロジックを追加
  - [x] `age_check_done=1` Cookie がない場合は `/age-check` へリダイレクト
  - [x] `/age-check` 自体・`/_next/` は除外（無限リダイレクト防止）
  - [x] Supabase のトークンリフレッシュと共存（`updateSession` の後で判定）

### Server Action
- [x] `app/age-check/actions.ts` 作成
  - [x] `confirmAge()`: `age_check_done=1` Cookie をセット（有効期限: 1年）し元のページへリダイレクト

### テスト
- [x] Cookie なしでアクセス → `/age-check` にリダイレクトされることを確認
- [x] 確認後にリロードしてもゲートが出ないことを確認
- [x] `/age-check` への直接アクセスが機能することを確認
