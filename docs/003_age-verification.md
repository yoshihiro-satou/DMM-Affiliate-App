# 003 年齢確認ゲート

## 概要
FANZAコンテンツへのアクセス前に年齢確認を必須化する。`middleware.ts` で Cookie を確認し、未確認ユーザーを `/age-check` にリダイレクト。

## 依存
- 001 Supabase 初期設定（middleware で Supabase トークンリフレッシュと共存させる）

## TODO

### ページ
- [ ] `app/age-check/page.tsx` 作成
  - [ ] 「18歳以上です」「18歳未満です」の2択ボタン
  - [ ] 18歳未満選択時は退場ページへ
  - [ ] デザインはシンプル・モバイルファースト（全画面表示）

### middleware 連携
- [ ] `middleware.ts` に年齢確認ロジックを追加
  - [ ] `age_check_done=1` Cookie がない場合は `/age-check` へリダイレクト
  - [ ] `/age-check` 自体・`/_next/` は除外（無限リダイレクト防止）
  - [ ] Supabase のトークンリフレッシュと共存（`updateSession` の後で判定）

### Server Action
- [ ] `app/age-check/actions.ts` 作成
  - [ ] `confirmAge()`: `age_check_done=1` Cookie をセット（有効期限: 1年）し元のページへリダイレクト

### テスト
- [ ] Cookie なしでアクセス → `/age-check` にリダイレクトされることを確認
- [ ] 確認後にリロードしてもゲートが出ないことを確認
- [ ] `/age-check` への直接アクセスが機能することを確認
