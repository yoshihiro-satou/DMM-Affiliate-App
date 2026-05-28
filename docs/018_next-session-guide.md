# 018 次回セッション引き継ぎガイド

> 作成日: 2026-05-26 / 最終更新: 2026-05-28（第5セッション） / 最終デプロイ: `311f5f7c`

---

## 現在のサイト状態（ひと目でわかる）

| 項目 | 状態 |
|------|------|
| 本番 URL | **https://fanzapicks.com** （カスタムドメイン稼働中） |
| テスト URL | https://dmm-affiliate-app.yoshihirock0710.workers.dev |
| ホスティング | Cloudflare Workers（opennextjs-cloudflare） |
| DMM API | ✅ **正常動作**（2026-05-28 夜 クォータリセット後に自然回復確認） |
| ISR キャッシュ | ✅ **Cloudflare KV 有効**（第5セッションで設定完了） |
| サイト名 | ✅ 「FANZAピックス」統一済み |
| Supabase | ✅ 接続正常 |
| PWA | ✅ Service Worker 稼働 |

---

## 2026-05-28（第5セッション）に完了した作業

| 作業 | 内容 |
|------|------|
| DMM API fetch の `{ next: { revalidate } }` 除去 | 全 fetch 呼び出しから削除（エラーレスポンスのキャッシュを防止） |
| Cloudflare KV ISR キャッシュ有効化 | `NEXT_INC_CACHE_KV` 作成・`open-next.config.ts` 修正 |
| `fetchBatch` の未使用 `ttl` 引数削除 | コード整理 |

### ⚠️ DMM API レート制限について（最重要教訓）

**症状：** 400 Bad Request、`"api_id":"Invalid Request Error"`

**原因：** DMM Affiliate API にはリクエスト上限がある。デバッグ中に下記が重なるとクォータを使い切る。
- `wrangler tail` 監視中のページロード（毎回 3〜4 リクエスト）
- `pnpm cf:deploy` のたびに新しいページが fresh レンダリング
- `curl` での手動テストの繰り返し

**特徴的な挙動：**
- ローカルの `curl` でも 400 が返る（IP 制限ではなく API キー単位のクォータ）
- ダッシュボードで「API IDに問題なし」と確認できていても 400 になる
- JST 深夜0時前後にクォータがリセットされて自然回復する

**対策（次回以降）：**
1. デバッグ時は `wrangler tail` を長時間流しっぱなしにしない
2. デプロイ後の確認は `curl` 1回のみ。何度も連打しない
3. ISR（KV）が有効なのでキャッシュ後は API 呼び出し頻度が大幅に減る

---

### ISR キャッシュ設定（Cloudflare KV）

今まで `open-next.config.ts` の `incrementalCache: "dummy"` によりキャッシュが完全無効だった。
これにより毎リクエストで DMM API を叩いており、レート制限の直接原因になっていた。

**変更内容：**

`open-next.config.ts`:
```ts
// 変更前
export default defineCloudflareConfig({ incrementalCache: "dummy" })

// 変更後
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache"
export default defineCloudflareConfig({ incrementalCache: kvIncrementalCache })
```

`wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "NEXT_INC_CACHE_KV"
id = "1e220c7428ee4b19a197951dbc0fd2b9"
```

**バインディング名の注意：** opennextjs-cloudflare が要求するバインディング名は `NEXT_INC_CACHE_KV`（固定）。
`NEXT_CACHE_WORKERS_KV` ではキャッシュが動かない。

**効果：** `export const revalidate = 3600` のページは 1 時間キャッシュされ、その間 DMM API への呼び出しが発生しない。

---

### DMM API fetch から `{ next: { revalidate } }` を除去

**経緯：** fetch に `{ next: { revalidate: N } }` を付けると、Cloudflare Cache API が **400 エラーレスポンスもキャッシュしてしまう**。
一度 400 がキャッシュされると N 秒間すべてのリクエストが 400 を返し続ける。

**修正：** `lib/dmm/client.ts` の全 DMM API fetch 呼び出しからオプションを削除。

```ts
// 変更前（全エンドポイント）
const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`, {
  next: { revalidate: 3600 },
})

// 変更後
const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`)
```

対象: `fetchItemList` / `fetchActressList` / `fetchFloorList` / `fetchBatch` / `fetchGenreList`

**ページキャッシュとの分担：**
- fetch レベルのキャッシュ → 廃止（エラーキャッシュ問題のため）
- ページレベルのキャッシュ → `export const revalidate = 3600` + KV ISR で対応

---

### `getCredentials()` の空文字対策

Cloudflare `wrangler secret put` で Enter を押すと空文字列が登録される。
`??`（null 合体）は空文字をスルーしないため `||` を使用。

```ts
// NG: 空文字列 "" を有効値とみなしてしまう
const api_id = process.env.DMM_API_ID ?? cfEnv.DMM_API_ID

// OK: 空文字列もフォールバックとして扱う
const api_id = process.env.DMM_API_ID || cfEnv.DMM_API_ID
```

---

## 2026-05-28（第4セッション）に完了した作業

| 作業 | コミット | 内容 |
|------|---------|------|
| GA4 User-ID 設定 | `a8739eaa` | ログインユーザーの Supabase UID を GA4 に渡す（初回ロード＋ログイン/ログアウト同期） |
| GA4 カスタムイベント実装 | `a8739eaa` | `add_to_wishlist` / `swipe` / `search` イベントを実装 |
| Search Console リンク | — | GA4 管理画面から fanzapicks.com をリンク済み |
| Google シグナル有効化 | — | GA4 管理画面から有効化済み |
| DMM_API_ID シークレット更新 | — | 400 Bad Request 再発 → FANZA ダッシュボードで正しい値を確認・再設定 |

---

## 2026-05-27（第3セッション）に完了した作業

| 作業 | コミット | 内容 |
|------|---------|------|
| next-env.mjs 秘密情報除去 | `5f90c92` | patch-worker.js に Patch 7 追加 — デプロイ後の API 破損を恒久解決 |

### Patch 7: next-env.mjs からサーバー秘密情報を除去（根本解決）

**問題の構造：**
```
opennextjs-cloudflare build
  └─ .env.local の全値を .open-next/cloudflare/next-env.mjs にハードコード
        ↓ init.js でシークレット(=)→ next-env.mjs(??=) の優先順
        ↓ シークレットの値が誤っていると両ソースとも誤った値になる
        → 400 Bad Request
```

**Patch 7 の解決策：**
`patch-worker.js` に `stripSecretsFromNextEnv()` 関数を追加。

- `opennextjs-cloudflare build` 直後、`NEXT_PUBLIC_` 以外の全キーを `next-env.mjs` から削除
- 削除対象: `DMM_API_ID`, `DMM_AFFILIATE_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY_JWK` など
- Cloudflare シークレット（`wrangler secret put`）が**唯一の情報源**になる

---

## 2026-05-27（第2セッション）に完了した作業

| 作業 | コミット | 内容 |
|------|---------|------|
| テキスト可読性改善 | `17a2ca9` | text-white/XX の透明度を全体的に引き上げ（42ファイル） |
| ホームヘッダー修正 | `28bba5d` | モバイルでのタイトル縦積みレイアウト・バランス改善 |
| DMM API キー修正 | シークレット更新 | Cloudflare Workers シークレットの誤った値を正しい値に更新 |

---

## 2026-05-27（第1セッション）に完了した作業

| 作業 | コミット | 内容 |
|------|---------|------|
| サイト名統一 | `3fde484` | 「おしランク」→「FANZAピックス」全11箇所 |
| GSC 確認ファイル | `09044e2` | `public/googled2702fb0af647cea.html` + meta タグ |
| middleware 修正 | `002c770` | `sitemap.xml` / `robots.txt` / Google確認ファイルを age-check 除外 |
| GA4 導入 | `f7843f2` | `G-X8VN2V321X`（afterInteractive で非同期ロード） |
| OGP 画像 | `d9814d3` | `public/og/default.png`（1200×630 PNG、satori 生成） |

---

## DMM API 400 エラー診断フロー

```
400 エラー発生
    ├─ ローカル curl も 400? → YES → DMMクォータ超過（深夜リセット待ち）
    │                         NO  → Cloudflare 側の認証情報問題
    │
    └─ FANZA ダッシュボードで API ID に問題なし?
           YES → クォータ超過か一時的な DMM 側障害
           NO  → wrangler secret put DMM_API_ID で再設定
```

**クォータ超過時にやること（とやってはいけないこと）：**
- ✅ 待つ（深夜0時JST以降に自然回復）— 2026-05-28 夜に実際に自然回復を確認
- ✅ `wrangler tail` を止める（回復確認は1回だけ curl する）
- ❌ 繰り返し curl テストして確認しようとする（さらにクォータを消費）
- ❌ 再デプロイして「直るかも」と試す（ページがキャッシュなし状態でAPIを叩く）

---

## Core Web Vitals の現状と方針

PageSpeed Insights は Cookie を持たないため、常に `/age-check` ページを計測する。

| 指標 | PSI（age-check） | 実態 |
|------|----------------|------|
| Performance | 80 | age-check ページの値（コンテンツページとは別） |
| SEO | 66 | "Page is blocked from indexing" = age-check の noindex が原因。正常な挙動 |
| LCP | 4.5秒 | age-check での重い日本語フォント読み込みが原因 |
| Accessibility | 100 | ✅ |
| Best Practices | 100 | ✅ |

---

## 積み残しタスク（優先順）

### 🟡 重要

#### X（Twitter）自動投稿の定期実行設定

`X_API_KEY` は設定済み。自動投稿スクリプトの定期実行（Cloudflare Cron）が未設定。

#### GA4 コンバージョン設定

- `add_to_wishlist` を「キーイベント」に登録（GA4 管理 → イベント）
- Enhanced Measurement で外部リンククリック（FANZA アフィリエイトリンク）を計測

### 🟢 推奨

#### 女優ページの充実

現在は女優名 + 商品一覧のみ。ユニークな説明文・h1 を追加するとロングテール SEO に効果。

#### OGP 画像の更新・再生成

```bash
pnpm og:generate    # public/og/default.png を再生成
```

---

## 法務チェックリスト

| 項目 | 状態 | 備考 |
|------|------|------|
| PR 表記 | ✅ | 各ページに「PR ·」表示あり |
| FANZAクレジット | ✅ | `DmmCredit` コンポーネントが layout に実装済み |
| 年齢確認ゲート | ✅ | middleware で `/age-check` リダイレクト実装済み |
| 自己アフィリエイト禁止 | 要注意 | 自分のアカウントでの購入は規約違反 |
| ソーシャルプルーフ | ✅ | レビュー数は DMM API の実データを使用 |
| 画像改変禁止 | ✅ | DMM 提供画像をそのまま表示 |

---

## 環境変数の現在値

`.env.local` に設定済み：
```
DMM_API_ID=uaVT3DGhgNk5XmNLZ9PG
DMM_AFFILIATE_ID=yoshihirock-990
NEXT_PUBLIC_SITE_URL=https://fanzapicks.com
NEXT_PUBLIC_SUPABASE_URL=https://ilaszemqlacscbaewyox.supabase.co
```

Cloudflare シークレット登録済み（`npx wrangler secret list` で確認）:
- `DMM_API_ID` / `DMM_AFFILIATE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY_JWK` / `VAPID_SUBJECT`
- `REVALIDATE_SECRET`

Cloudflare KV:
- `NEXT_INC_CACHE_KV` — id: `1e220c7428ee4b19a197951dbc0fd2b9`（ISR キャッシュ）

---

## デプロイ手順（毎回の確認用）

```bash
pnpm cf:deploy   # ビルド → パッチ → Cloudflare デプロイ（約3分）
```

デプロイ後の確認（**1回だけ** — 連打しない）：
```bash
curl -b "age_check_done=1" "https://fanzapicks.com/api/dmm/items?hits=1&sort=rank&service=digital&floor=videoa"
# → {"items":[...]} ならOK、{"error":"DMM API fetch failed"} なら API 問題
```

リアルタイムログ（長時間流しっぱなし注意）：
```bash
npx wrangler tail --format pretty
```

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/017_cloudflare-windows-deploy.md` | Cloudflare Workers デプロイの全問題と解決策 |
| `docs/019_analytics-setup.md` | GA4 アナリティクス設定 |
| `docs/002_dmm-api-client.md` | DMM API クライアント・型定義・キャッシュ戦略 |
| `CLAUDE.md` | プロジェクト全体の設計方針 |
