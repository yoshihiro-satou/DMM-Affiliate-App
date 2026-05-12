# 015 X（Twitter）自動投稿

## 概要
Cloudflare Workers cron で1日3回（7時/12時/20時）、`sale_queue` から値下げアラートを取得して X API v2 で自動投稿する。Free プランで運用。

## 依存
- 008 価格監視 Cron（`sale_queue` にデータが入っていること）

## TODO

### X Developer Account 設定
- [ ] X Developer Account 申請承認を確認
- [ ] Developer Portal でアプリ作成・OAuth 1.0a の 4つのキーを取得
- [ ] `wrangler secret put` で Cloudflare 環境変数に登録
  - [ ] `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`

### Workers スクリプト
- [ ] `workers/x-poster.ts` 作成
  - [ ] `scheduled(event, env, ctx)` ハンドラを実装
  - [ ] `sale_queue` から `posted = false` かつ `last_posted_at` が72時間以前のレコードを取得
    - [ ] お気に入り登録数降順で優先度付け
    - [ ] 最大3件まで
  - [ ] ツイートテキストを生成
    ```
    🔥 値下げ速報
    「{作品タイトル（30文字）」
    ¥{定価} → ¥{現在価格}（{割引率}%OFF）
    ▶ {affiliateURL}
    #FANZA #値下げ #セール
    ```
  - [ ] X API v2 `POST /2/tweets` でツイート
  - [ ] 成功後: `sale_queue` の `posted = true` / `last_posted_at` を更新
  - [ ] 失敗時: エラーをログ出力してスキップ（リトライなし）

### wrangler.toml 設定
- [ ] `[[triggers]] crons = ["0 22,3,11 * * *"]`（UTC 22時=JST 7時、UTC 3時=JST 12時、UTC 11時=JST 20時）

### スパム対策の確認
- [ ] 同一作品72時間以内の再投稿禁止ロジックを単体テスト
- [ ] 割引率10%未満はスキップされることを確認
- [ ] 1回の cron で最大3件を超えないことを確認

### デプロイ・確認
- [ ] `wrangler deploy workers/x-poster.ts`
- [ ] Cloudflare Dashboard の cron ログで実行確認
- [ ] X のタイムラインに投稿が表示されることを確認
