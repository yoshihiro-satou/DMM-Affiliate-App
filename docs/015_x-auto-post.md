# 015 X（Twitter）自動投稿

## 概要
Cloudflare Workers cron で1日3回（7時/12時/20時）、`sale_queue` から値下げアラートを取得して X API v2 で自動投稿する。Free プランで運用。

## 依存
- 008 価格監視 Cron（`sale_queue` にデータが入っていること）

## 実装済み（2026-05-15）

### Supabase RPC
- [x] `get_pending_sale_items(max_count int)` 関数を追加（マイグレーション適用済み）
  - `sale_queue` の `status = 'pending'` かつ `discount_rate >= 10` のレコードを対象
  - 同一 `item_id` が過去72時間以内に `status = 'posted'` で存在する場合はスキップ
  - `favorites` テーブルと LEFT JOIN し、お気に入り登録数降順で優先度付け
  - お気に入り同数時は `discount_rate` 降順
  - `SECURITY DEFINER` でサービスロールと同等権限で実行

### Workers スクリプト（`workers/x-poster.ts`）
- [x] OAuth 1.0a (HMAC-SHA1) を Web Crypto API のみで実装
  - nonce / timestamp 生成 → OAuth パラメータをアルファベット順ソート → base string 構築 → HMAC-SHA1 署名 → Authorization ヘッダー生成
- [x] `GET /rest/v1/rpc/get_pending_sale_items` で pending アイテムを取得（最大3件）
- [x] ツイートテキスト生成
  ```
  🔥 値下げ速報
  「{作品タイトル（30文字、超過時…）」
  ¥{定価} → ¥{現在価格}（{割引率}%OFF）
  ▶ {affiliateURL}
  #FANZA #値下げ #セール
  ```
- [x] X API v2 `POST /2/tweets` でツイート
- [x] 成功後: `sale_queue` の `status = 'posted'` / `posted_at` を更新
- [x] 失敗時: エラーをログ出力してスキップ（pending のまま次回 cron で再試行）
- [x] `fetch` ハンドラで HTTP GET による手動実行にも対応
- [x] スパム対策
  - 同一作品72時間以内の再投稿禁止（RPC 側でフィルタ）
  - 割引率10%未満はスキップ（RPC 側でフィルタ）
  - 1回の cron で最大3件（`MAX_POSTS_PER_RUN = 3`）

### wrangler 設定（`workers/x-poster.toml`）
- [x] `crons = ["0 22,3,11 * * *"]`（UTC 22時=JST 7時、UTC 3時=JST 12時、UTC 11時=JST 20時）

## ファイル構成

```
workers/x-poster.ts     ← 新規（X 自動投稿 Worker）
workers/x-poster.toml   ← 新規（Worker 設定・cron）
```

## 初期セットアップ

### X Developer Account 設定
1. [developer.twitter.com](https://developer.twitter.com) でプロジェクト・アプリを作成
2. OAuth 1.0a の4つのキーを取得（Read and Write 権限が必要）
3. Cloudflare Workers シークレットに登録:
   ```bash
   wrangler secret put X_API_KEY               --name dmm-x-poster
   wrangler secret put X_API_SECRET            --name dmm-x-poster
   wrangler secret put X_ACCESS_TOKEN          --name dmm-x-poster
   wrangler secret put X_ACCESS_TOKEN_SECRET   --name dmm-x-poster
   wrangler secret put SUPABASE_URL            --name dmm-x-poster
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name dmm-x-poster
   ```

### Worker デプロイ
```bash
wrangler deploy --config workers/x-poster.toml
```

## アーキテクチャ補足

### OAuth 1.0a 署名フロー
X API v2 は `POST /2/tweets` に OAuth 1.0a を要求する。  
Web Crypto API の `crypto.subtle`（HMAC-SHA1）のみで実装しているため外部ライブラリ不要。

1. `oauth_nonce`（16バイトランダム hex）と `oauth_timestamp` を生成
2. 全 OAuth パラメータをアルファベット順にソートし `&` 結合
3. `METHOD & url_encoded(url) & url_encoded(params)` でベース文字列を構築
4. `consumer_secret & token_secret` を署名キーとして HMAC-SHA1 で署名
5. `Authorization: OAuth ...` ヘッダーに組み込んで送信

### スパム対策ロジック
```
RPC get_pending_sale_items:
  WHERE status = 'pending'
    AND discount_rate >= 10          ← 10%未満スキップ
    AND NOT EXISTS (                  ← 72時間以内の再投稿禁止
      SELECT 1 FROM sale_queue sq2
      WHERE sq2.item_id = sq.item_id
        AND sq2.status = 'posted'
        AND sq2.posted_at > NOW() - INTERVAL '72 hours'
    )
  ORDER BY favorite_count DESC, discount_rate DESC  ← お気に入り数優先
  LIMIT max_count
```

### Free プランの制限
- 月1500投稿上限: 1日3回 × 最大3件 × 30日 = **最大270投稿/月**（余裕あり）
- 重複投稿: X API は24時間以内の同一テキスト投稿をエラーにする。タイトルが同じでも価格が異なれば別テキストになる。さらにRPCの72時間チェックで同一アイテムの連続投稿も防止。

## テスト
- [ ] `wrangler dev --config workers/x-poster.toml` でローカル実行
  ```bash
  curl http://localhost:8787/
  ```
- [ ] Cloudflare Dashboard → Workers → dmm-x-poster → Logs で実行ログを確認
- [ ] X のタイムラインに投稿が表示されることを確認
- [ ] `sale_queue` の `status` が `posted` に更新されていることを確認
- [ ] 同一 `item_id` を72時間以内に再度投稿しようとした場合、RPC でフィルタされることを確認

## 制限・既知の挙動
- X API Free プランは `POST /2/tweets` のみ対応。メディア添付（画像）は Basic プラン以上が必要
- Worker 失敗時は `pending` のまま残り、次回 cron で再試行される（最終的に手動で `skipped` に変更する場合は Supabase Dashboard から直接更新）
- X Developer Account の申請・承認が完了していないとデプロイしても投稿は実行されない
