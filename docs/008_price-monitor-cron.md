# 008 価格監視・Cloudflare Workers Cron

## 概要
Cloudflare Workers の cron トリガーで毎時 DMM API を叩き、価格変動を検知して `sale_queue` に積む。X投稿（015）・プッシュ通知（014）のデータソースになる。

## 依存
- 001 Supabase 初期設定
- 002 DMM API クライアント

## TODO

### Supabase DB 関数（マイグレーション適用済み）
- [x] `get_top_favorited_items(limit_count int)` — `favorites` テーブルを GROUP BY して上位 N 件の item_id を返す（SECURITY DEFINER）
- [x] `get_latest_prices(item_ids text[])` — `DISTINCT ON` で各 item_id の最新価格のみを返す。`limit` によるデータ漏れを防ぐ設計（SECURITY DEFINER、STABLE）

### Workers スクリプト
- [x] `workers/price-monitor.ts` 作成
  - [x] `scheduled(controller, env, ctx)` ハンドラを実装（`ctx.waitUntil` で非同期完走）
  - [x] お気に入り登録数上位100件の `item_id` を Supabase RPC で取得
  - [x] item_id を正規表現でバリデーション（PostgREST の `in.(...)` URL 構文保護）
  - [x] `price_history` と `recentlyQueued` を `Promise.all` で並列取得（DBラウンドトリップ最小化）
  - [x] DMM API `ItemList?cid=` で現在価格を取得（`Promise.all` で最大10件並列 × バッチ間500ms待機）
  - [x] 割引率を `processItem` 内で一元計算（`price_history` と `sale_queue` で一貫した値を保証）
  - [x] 値下がり検知（割引率10%以上）→ `sale_queue` に INSERT
    - [x] 重複防止: 同一 `item_id` が72時間以内に `sale_queue` にあればスキップ
  - [x] `price_history` に新しい価格レコードを INSERT（毎回記録）
  - [x] `item_title` / `affiliate_url` が空の場合はキューへの追加をスキップ（NOT NULL カラム保護）

### wrangler.toml 設定
- [x] `workers/wrangler.toml` 作成
  - [x] `name = "dmm-price-monitor"`（Pages アプリとは別 Worker）
  - [x] `[triggers] crons = ["0 * * * *"]`（毎時0分）
  - [x] `compatibility_flags = ["nodejs_compat"]`
- [x] `workers/tsconfig.json` 作成（Workers 独立ビルド設定、`skipLibCheck: true`）

### package.json スクリプト
- [x] `worker:dev` — `wrangler dev --config workers/wrangler.toml --test-scheduled`
- [x] `worker:deploy` — `wrangler deploy --config workers/wrangler.toml`

### シークレット登録（デプロイ前に実施）
機密情報はすべて `wrangler secret put` で登録する（git にコミットしない）:

```bash
echo "$NEXT_PUBLIC_SUPABASE_URL" | pnpm wrangler secret put SUPABASE_URL --name dmm-price-monitor
echo "$SUPABASE_SERVICE_ROLE_KEY" | pnpm wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name dmm-price-monitor
echo "$DMM_API_ID" | pnpm wrangler secret put DMM_API_ID --name dmm-price-monitor
echo "$DMM_AFFILIATE_ID" | pnpm wrangler secret put DMM_AFFILIATE_ID --name dmm-price-monitor
```

### デプロイ
- [ ] `pnpm worker:deploy` でデプロイ
- [ ] Cloudflare Dashboard → Workers → dmm-price-monitor → Triggers でcron確認
- [ ] Cloudflare Dashboard のログで実行結果を確認

### テスト
- [ ] `pnpm worker:dev` でローカル起動
- [ ] `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"` でトリガーテスト
- [ ] Supabase で `favorites` にダミーデータを挿入し `price_history` に記録されることを確認
- [ ] 手動で `price_history` に低い価格を INSERT して `sale_queue` に積まれることを確認

---

## 日替わりリバリデート Worker（daily-revalidate）

### 概要

FANZA 日替わり商品は毎日 0:00 JST に切り替わる。ISR キャッシュを 0:01 JST に自動破棄してトップページを再生成するために、別の Cloudflare Worker Cron を用意する。

### ファイル

| ファイル | 内容 |
|--------|------|
| `workers/daily-revalidate.ts` | Cron ハンドラ — `/api/revalidate` を POST 呼び出し |
| `workers/daily-revalidate.toml` | wrangler 設定 — cron `"1 15 * * *"` (0:01 JST) |
| `app/api/revalidate/route.ts` | Next.js Route Handler — `x-revalidate-secret` ヘッダー認証 + `revalidatePath('/')` |

### TODO

- [x] `workers/daily-revalidate.ts` 作成
  - [x] `scheduled()` ハンドラで以下を `Promise.all` で並列実行
    - `POST /api/revalidate`（ISR キャッシュ破棄）
    - `POST /api/oshi-notify`（推し女優日替わり通知キュー投入）
  - [x] `x-revalidate-secret: env.REVALIDATE_SECRET` ヘッダーで認証
  - [x] `ctx.waitUntil()` で非同期完走を保証
- [x] `workers/daily-revalidate.toml` 作成
  - [x] `name = "dmm-daily-revalidate"`
  - [x] `crons = ["1 15 * * *"]` （JST 0:01 = UTC 15:01）
  - [x] シークレットのコメント注記
- [x] `app/api/revalidate/route.ts` 作成
  - [x] `runtime = 'nodejs'`（Edge では `revalidatePath` 不可）
  - [x] `REVALIDATE_SECRET` 環境変数との照合（不一致なら 401）
  - [x] `revalidatePath('/')` で ISR キャッシュを破棄
- [ ] 本番デプロイ（下記コマンド参照）

### シークレット登録 & デプロイ

```bash
# シークレット生成（初回のみ）
openssl rand -hex 32   # → REVALIDATE_SECRET として .env.local と wrangler secret の両方に設定

wrangler secret put SITE_URL           --config workers/daily-revalidate.toml
wrangler secret put REVALIDATE_SECRET  --config workers/daily-revalidate.toml
wrangler deploy --config workers/daily-revalidate.toml
```

### キャッシュ戦略

- `revalidatePath('/')` はページレベルの ISR キャッシュのみ破棄する
- 日替わり商品データは `React.cache()` でリクエスト内重複排除（`unstable_cache` は POST フェッチと相性が悪いため不使用）
- 日替わりデータの GraphQL フェッチ自体は POST なので Next.js はデフォルトでキャッシュしない

---

## アーキテクチャ上の注意点

### Worker とNext.js の分離
- `workers/price-monitor.ts` は Cloudflare Workers V8 ランタイムで動作するため、Next.js の `server-only`・`@/` エイリアス・`React.cache` は使用不可
- `lib/dmm/client.ts` とは独立した DMM API fetch を実装（`'server-only'` インポート不可のため）
- `parseIntPrice` は `lib/ranking.ts` の `parsePrice` と同一ロジック。Workers ビルドから `@/lib/ranking` を参照できないため Worker 内に複製している

### 価格履歴の設計
- `price_history` には毎時100件ずつ最大2400レコード/日が追加される。Supabase Free でも許容範囲
- `get_latest_prices` RPC が `DISTINCT ON` を使うため、レコード数が増えても正確な最新価格が取得できる

### セキュリティ
- `SUPABASE_SERVICE_ROLE_KEY` は `wrangler secret put` でのみ設定。ログへの出力なし
- `DMM_API_ID` / `DMM_AFFILIATE_ID` も同様にシークレット管理
- item_id は `/^[\w-]+$/` でバリデーション後に PostgREST クエリに使用
- Supabase REST API の `in.(...)` クエリは PostgREST がプリペアドステートメントに変換するため SQLインジェクション不可
