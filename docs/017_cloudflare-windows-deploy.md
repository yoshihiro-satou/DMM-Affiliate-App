# 017 Cloudflare Workers デプロイ（Windows 環境の落とし穴）

## 概要

`@opennextjs/cloudflare` を使って Next.js App Router アプリを Cloudflare Workers へデプロイする際、
Windows 環境固有の問題が複数あって壊滅的にはまった。次回以降の作業のために記録する。

**全問題解決済み。本番 Workers でページ・API Routes が正常動作することを確認済み。**

---

## 確認済みの環境

| 項目 | バージョン |
|------|-----------|
| Next.js | 16.2.6（Turbopack ビルド） |
| @opennextjs/cloudflare | 1.19.x |
| wrangler | 4.90.x |
| OS | Windows 11 / PowerShell |

---

## デプロイコマンド（最終形）

```bash
pnpm cf:build    # opennextjs-cloudflare build + node scripts/patch-worker.js
pnpm cf:deploy   # cf:build + opennextjs-cloudflare deploy
```

`package.json` の定義：

```json
{
  "cf:build": "opennextjs-cloudflare build && node scripts/patch-worker.js",
  "cf:preview": "opennextjs-cloudflare build && node scripts/patch-worker.js && wrangler dev",
  "cf:deploy": "opennextjs-cloudflare build && node scripts/patch-worker.js && opennextjs-cloudflare deploy"
}
```

---

## 問題 1：`wrangler.toml` のフォーマット（Workers vs Pages）

### 症状
`opennextjs-cloudflare deploy` が失敗、または Pages プロジェクト扱いになってデプロイできない。

### 原因
`@opennextjs/cloudflare@1.19` 以降は **Cloudflare Workers** 形式でデプロイする。
以前の Pages 形式（`pages_build_output_dir`）のまま残っていると動かない。

### 正しい `wrangler.toml`

```toml
name = "dmm-affiliate-app"
main = ".open-next/worker.js"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[alias]
"@opentelemetry/api" = "./scripts/stub-otel.js"
"next/dist/server/load-manifest.external.js" = "./scripts/load-manifest-stub.js"
"next/dist/server/lib/router-utils/instrumentation-globals.external.js" = "./scripts/stub-instrumentation-globals.js"
"next/dist/server/app-render/work-unit-async-storage-instance" = "./scripts/stub-work-unit-async-storage-instance.js"
"next/dist/server/app-render/work-async-storage-instance" = "./scripts/stub-work-async-storage-instance.js"

[vars]
# 本番環境変数は wrangler secret put で設定（下記「問題 6」参照）
```

---

## 問題 2：`next/og`（OG画像）が Windows でビルドエラー

### 症状
```
Could not resolve "...resvg.wasm"
Could not resolve "...yoga.wasm"
```
パスが `C:/Users/.../DMM-Affiliate-App.open-nextserver-functionsdefault\node_modules...` のように壊れる。

### 原因
`next/og`（ImageResponse）が内部で `.wasm` ファイルを動的ロードするが、
Windows のパス区切り文字 `\` と esbuild の処理が干渉してパスが破損する。

### 対処
**OG画像ファイルをすべて削除する。**
削除対象：
- `app/opengraph-image.tsx`
- `app/apple-icon.tsx`
- `app/sale/opengraph-image.tsx`
- `app/ranking/opengraph-image.tsx`
- `app/actress/opengraph-image.tsx`

> `next/og` は Cloudflare Workers 環境では使用不可（wasm の扱いが困難）。

---

## 問題 3：`getMiddlewareManifest()` が動的 `require()` を使う

### 症状
```
Error: Dynamic require of "/.next/server/middleware-manifest.json" is not supported
```

### 原因
Next.js の `getMiddlewareManifest()` が `require(this.middlewareManifestPath)` を実行する。
Cloudflare Workers（workerd）は動的 `require()` 非対応。

### 対処（`scripts/patch-worker.js` Patch 1）
ビルド後に `handler.mjs` を書き換え、JSON をインライン展開する：

```js
// Before
getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}

// After
getMiddlewareManifest(){return this.minimalMode?null:{ /* inlined JSON */ }}
```

パッチ対象ファイル：`.open-next/server-functions/default/handler.mjs`（`worker.js` ではない）

---

## 問題 4：`requireChunk()` が空になる（Windows パス区切り文字バグ）

### 症状
```
TypeError: components.ComponentMod.handler is not a function
```
（最初は `Error: Not found {chunkPath}` として現れることもある）

### 原因
`@opennextjs/cloudflare` が Turbopack の `requireChunk()` スイッチ文を生成するとき、
内部で `file.includes('/server/chunks/')` をチェックする。
Windows では `tracedFiles` のパスが `\` 区切りのため、このチェックが全件 false になり、
スイッチ文が空のまま（`throw new Error(...)` だけ）になる。

### 確認方法
ビルド後の `handler.mjs` を検索：
```
function requireChunk(chunkPath){throw new Error(`Not found ${chunkPath}`)}
```
このパターンが **2箇所** あれば未パッチ状態。

### 対処（`scripts/patch-worker.js` Patch 2）

重要ポイントが3つある：

#### ポイント A：パスキーの形式

`R.c()` が渡すパスは `"server/chunks/ssr/foo.js"` 形式（`.next` からの相対パス）。
`baseDir` を `.next/server` にして `path.relative()` で取ると `chunks/ssr/foo.js` になるため、
**先頭に `server/` を付ける**必要がある。

```js
// NG（chunks/ から始まる → R.c() のキーと一致しない）
case "chunks/ssr/foo.js": return require(...)

// OK（server/chunks/ から始まる）
case "server/chunks/ssr/foo.js": return require(...)
```

#### ポイント B：2つの Turbopack ランタイム

`handler.mjs` には `requireChunk` が **2箇所**ある：
- 1箇所目：非SSR Turbopack ランタイム（API Route など）
- 2箇所目：SSR Turbopack ランタイム（App Router ページ）

App Router ページ（`/age-check` など）は SSR ランタイムを使うため、
**2箇所とも**パッチする必要がある。`String.prototype.replace()` は最初の1箇所しか置換しないので、
`split().join()` を使う：

```js
// NG：1箇所しか置換しない
handler = handler.replace(brokenRequireChunk, fixedRequireChunk)

// OK：全箇所置換
handler = handler.split(brokenRequireChunk).join(fixedRequireChunk)
```

#### ポイント C：`@opentelemetry/api` の解決エラー

wrangler が `requireChunk` の `require(absolutePath)` を辿って chunk ファイルをバンドルすると、
chunk 内に `require('@opentelemetry/api')` が含まれておりバンドル失敗する。

```
Could not resolve "@opentelemetry/api"
```

対処：`wrangler.toml` にエイリアスを追加し、スタブファイルに向ける：

```toml
[alias]
"@opentelemetry/api" = "./scripts/stub-otel.js"
```

**重要：スタブは空オブジェクト（`module.exports = {}`）では不十分。**
Next.js は `createContextKey` / `context` / `trace` / `propagation` / `diag` / `createNoopMeter` など
多数のメンバーを参照するため、すべて no-op 実装する必要がある。
→ `scripts/stub-otel.js` の内容を参照。

---

## 問題 5：`externalRequire` が未パッチの node_modules を読む

### 症状
```
[unenv] fs.readFileSync is not implemented yet!
```
ページが 500 エラー、または `wrangler tail` で exceptions が発生する。

### 原因
Turbopack SSR チャンクは外部モジュール参照に `a.x("module-id", () => require("module-id"))` を使う。
これが `externalRequire(id, thunk)` → `thunk()` → 素の node_modules を `require()` する流れになる。
node_modules の `app-page-turbo.runtime.prod.js` には `loadManifest` が `fs.readFileSync` を呼ぶ箇所があり、
Cloudflare Workers 上では `readFileSync` が未実装なため実行時エラーになる。

wrangler のバンドル時には `inlineExternalImportRule` がパスを `/` 区切りでマッチするが、
Windows では `tracedFiles` のパスが `\` 区切りのためマッチせず、パッチ済み `require_*` 関数に
リダイレクトされない。これが根本原因。

### 対処（`scripts/patch-worker.js` Patch 3）

SSR チャンクを走査して `.x("module-id", ...)` の `module-id` を収集し、
`handler.mjs` 内にバンドル済みの `require_*` 関数（esbuild が生成した `loadManifest` パッチ済み版）
が存在する場合は switch 文でリダイレクトする：

```js
// Before
function externalRequire(id,thunk,esm2=!1){let raw;try{raw=thunk()}

// After
function externalRequire(id,thunk,esm2=!1){let raw;try{switch(id){
  case "app-page-turbo.runtime.prod.js":raw=require_app_page_turbo_runtime_prod();break;
  ...
  default:raw=thunk()
}}
```

- `handler.mjs` 内で `var require_xxx=__commonJS({` の直前 600 文字を走査して変数名を特定する
- `externalRequire` も2つの Turbopack ランタイムに存在するため、`split().join()` で全置換する
- バンドルされていないモジュールは `default: raw=thunk()` でフォールスルー

---

## 問題 6：本番 Cloudflare Workers に環境変数（シークレット）が未設定

### 症状
```
An error occurred in the Server Components render.
The specific message is omitted in production builds...
```
（`app/error.tsx` のエラーバウンダリが表示される）

### 原因
`wrangler secret put` でシークレットを登録しないと、本番 Worker で
`process.env.DMM_API_ID` などが `undefined` になる。
DMM API クライアント（`lib/dmm/client.ts`）は未設定時に例外を throw するため
Server Component がクラッシュする。

`NEXT_PUBLIC_*` 変数はビルド時に bundle へ埋め込まれるため、シークレット登録は不要。

### 必要なシークレット登録コマンド

```bash
npx wrangler secret put DMM_API_ID
npx wrangler secret put DMM_AFFILIATE_ID
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VAPID_PRIVATE_KEY_JWK
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put REVALIDATE_SECRET
```

各コマンド実行後にターミナルで値を入力する（プロンプトが出る）。
**シークレットはリデプロイなしで即時反映される。**

### 登録確認

```bash
npx wrangler secret list
```

### `app/error.tsx` エラーバウンダリについて

Server Component のエラーが Worker クラッシュに直結しないよう、
App Router のルートレベルに `app/error.tsx` を追加している：

```tsx
'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error.message, error.digest)
  }, [error])
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm text-white/50">{error.message}</p>
      <button onClick={reset} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
        再試行
      </button>
    </main>
  )
}
```

エラーバウンダリがあると Cloudflare のエラーページではなく
Next.js のエラーUIが表示されるため、`error.digest` でトレースしやすくなる。

---

## 問題 7：API Route で `cookies()` が "called outside request scope" エラー

### 症状
`/api/recommend` や `/api/view` など `cookies()` を使う API Route が 500 を返す。
Server Component ページ（`/` や `/ranking` など）は正常に動く。

```
Error: cookies() was called outside a request scope.
```

### 根本原因：AsyncLocalStorage の二重インスタンス問題

`cookies()` は Next.js の `workUnitAsyncStorageInstance`（AsyncLocalStorage）に
現在のリクエストコンテキストを保存・取得する。

**問題の流れ：**

1. `handler.mjs` の `workUnitAsyncStorageInstance` は Patch 6a で `globalThis.__NEXT_WUAS` に
   シングルトン化される（`.open-next` 内の node_modules に適用）
2. **API Route** のハンドラは `app-route-turbo.runtime.prod.js` を使う
3. `app-route-turbo.runtime.prod.js` は `externalRequire` の switch に含まれず `thunk()` に落ちる
4. `thunk()` → wrangler が **プロジェクトルート**の `node_modules/` から esbuild でバンドル
5. プロジェクトルートの `work-unit-async-storage-instance.js` は Patch 6b（`.open-next` 内適用）に
   含まれず **未パッチのまま**残る → 新規 AsyncLocalStorage インスタンスが生成される
6. リクエスト開始時に `globalThis.__NEXT_WUAS` へ context をセットしても、
   API Route 側は別インスタンスを参照するため `cookies()` が context を見つけられない

### 確認方法

`/api/test-cookies` のような最小エンドポイントを作って確認する：

```typescript
// app/api/test-cookies/route.ts
import { cookies } from 'next/headers'
export async function GET() {
  const store = await cookies()
  return Response.json({ ok: true, count: store.getAll().length })
}
```

- 正常 → `{"ok":true,"count":0}`
- 異常 → `Error: cookies() was called outside a request scope.`

### 対処（`scripts/patch-worker.js` Patch 6e/6f）

**プロジェクトルートの `node_modules/` にある両ファイルを Turbopack 互換スタブで上書き**する。

#### Turbopack 互換スタブの条件（重要）

スタブで `require('async_hooks')` を使うと**ビルドが壊れる**。

Turbopack は `work-unit-async-storage-instance.js` をクライアントコンポーネントの
ブラウザバンドルとしても処理することがあり、`async_hooks` がブラウザで解決できずエラーになる：

```
Module not found: Can't resolve 'async_hooks'
```

**正しいスタブ**：`require('./async-local-storage')` を使う。
Turbopack はクライアントビルド時にこれを自動スタブするため安全。

```javascript
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const _als = require('./async-local-storage')            // ← async_hooks ではなくこちら
if (!globalThis.__NEXT_WUAS) {
  globalThis.__NEXT_WUAS = _als.createAsyncLocalStorage()
}
Object.defineProperty(exports, 'workUnitAsyncStorageInstance', {
  enumerable: true,
  get: function () { return globalThis.__NEXT_WUAS },
})
```

`work-async-storage-instance.js` 側は `globalThis.__NEXT_WAS` / `workAsyncStorageInstance` を使う。

#### `overwriteInProjectNodeModules` 関数（patch-worker.js）

スタブ内容をファイルから読まず、**インライン文字列連結で生成**することで
テンプレートリテラルのエスケープ問題を回避する：

```javascript
function overwriteInProjectNodeModules(exportName, globalKey, fileName, patchLabel) {
  const stubContent = [
    "'use strict'",
    "Object.defineProperty(exports, '__esModule', { value: true })",
    "const _als = require('./async-local-storage')",
    "if (!globalThis." + globalKey + ") {",
    "  globalThis." + globalKey + " = _als.createAsyncLocalStorage()",
    "}",
    "Object.defineProperty(exports, '" + exportName + "', {",
    "  enumerable: true,",
    "  get: function () { return globalThis." + globalKey + " },",
    "})",
  ].join('\n') + '\n'

  // pnpm の .pnpm ストアと node_modules/next 直接の両方を上書き
  const APP_RENDER_REL = path.join('next', 'dist', 'server', 'app-render', fileName)
  // ...（pnpmStore を走査して next@ ディレクトリを上書き）
}

// 呼び出し
overwriteInProjectNodeModules('workUnitAsyncStorageInstance', '__NEXT_WUAS', 'work-unit-async-storage-instance.js', 'Patch 6e')
overwriteInProjectNodeModules('workAsyncStorageInstance',     '__NEXT_WAS',  'work-async-storage-instance.js',      'Patch 6f')
```

#### wrangler.toml `[alias]` との違い

`[alias]` はモジュール指定子（`"next/dist/server/..."` のような絶対名）のみ有効で、
`"./work-unit-async-storage-instance"` のような**相対パス**の require には効かない。
プロジェクトルート node_modules を直接書き換えるのはそのため。

---

## 問題 8：DMM API が 400 を返す（api_id: Invalid Request Error）

### 症状
API Route が DMM API を呼ぶと 400 Bad Request が返る。
`cookies()` のエラーではなく以下のような DMM レスポンスが返る：

```json
{"result":{"status":400,"message":"BAD REQUEST","errors":{"api_id":"Invalid Request Error"}}}
```

### 診断手順

まず CDN キャッシュを避けてローカルから直接確認する：

```bash
curl "https://api.dmm.com/affiliate/v3/ItemList?api_id=<YOUR_ID>&affiliate_id=<YOUR_AFFILIATE_ID>&output=json&site=FANZA&hits=1"
```

ローカルから叩いても同じ 400 が返る場合は、コード・Cloudflare 側の問題ではなく
**DMM 側のアカウント/API設定の問題**。

### 原因と確認箇所

| 原因候補 | 確認場所 |
|---------|---------|
| **サイト名・サイトURL 未登録** | DMM アフィリエイト → Webサービス設定 でサイト情報を入力する必要がある |
| API 利用が無効 | 同設定ページで「利用中」ステータスを確認 |
| affiliate_id の不一致 | API用 affiliate_id は末尾 `-990`〜`-997` 形式であること |
| キャッシュヒットで誤魔化される | `next: { revalidate: 3600 }` + Cloudflare CDN の stale-while-revalidate で古い成功レスポンスが返ることがある |

### CDN キャッシュで誤魔化される罠

`/api/dmm/items?sort=rank&hits=5` などのエンドポイントは
`Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` を返す。
Cloudflare CDN が古い成功レスポンスをキャッシュしている間は正常に見えるが、
**キャッシュバストパラメータ（`?_nocache=1` など）を付けると真の状態を確認できる。**

```bash
# キャッシュなしで確認
curl "https://dmm-affiliate-app.yoshihirock0710.workers.dev/api/dmm/items?sort=rank&hits=5&_nocache=1"
```

### 対処

DMM アフィリエイトコンソール（https://affiliate.dmm.com/api/）で：
1. サイト名を登録（例：FANZA Picks）
2. サイト URL を登録（例：`https://fanza-picks.com`）
3. API 利用ステータスが「利用中」になることを確認

---

## 年齢確認（middleware）の動作仕様

`lib/supabase/middleware.ts` の年齢確認ロジック：

- 未ログイン・Cookie なし → `/age-check` へリダイレクト
- 未ログイン・Cookie あり → そのまま通過
- **ログイン済み（Supabase セッションあり）→ `age_check_done` Cookie を自動付与してスキップ**

ログイン済みユーザーが年齢確認ページを見ないのは正常動作。
未ログイン状態のテストはシークレットウィンドウで行う。

---

## 適用済み変更一覧

| 変更 | ファイル | 結果 |
|------|---------|------|
| Workers 形式 `wrangler.toml` | `wrangler.toml` | deploy 成功 |
| OG 画像ファイルを削除 | `app/*/opengraph-image.tsx` 等 | wasm ビルドエラー解消 |
| Patch 1: middleware-manifest インライン化 | `scripts/patch-worker.js` | dynamic require エラー解消 |
| Patch 2: requireChunk static switch（159 chunks） | `scripts/patch-worker.js` | チャンク読み込み成功 |
| Patch 3: externalRequire bundled switch | `scripts/patch-worker.js` | `fs.readFileSync` エラー解消 |
| `@opentelemetry/api` no-op スタブ | `scripts/stub-otel.js` | wrangler バンドルエラー解消 |
| `[alias]` 5件 | `wrangler.toml` | OTel・load-manifest・ALS スタブ参照 |
| `app/error.tsx` エラーバウンダリ | `app/error.tsx` | Worker クラッシュ防止 |
| Cloudflare シークレット 6 件登録 | wrangler secret put | DMM API / Supabase 動作 |
| Patch 6a/6c: workUnit/workAsync ALS → globalThis | `scripts/patch-worker.js` | .open-next 内シングルトン化 |
| Patch 6e/6f: プロジェクトルート node_modules 上書き | `scripts/patch-worker.js` | API Route の cookies() 修正 |

**すべて解決。本番サイトのページ・API Routes が正常に動作することを確認済み（2026-05-26）。**

---

## WSL2 を使う場合（参考）

`@opennextjs/cloudflare` 公式は WSL2 推奨。Windows 環境の `\` パス問題を根本的に回避できる。
上記の Patch 2・3 は不要になる可能性が高い。

```bash
# WSL2 上で実行
cd /mnt/c/Users/yoshihiro/Documents/GitHub/DMM-Affiliate-App
pnpm cf:deploy
```

ただし Windows から直接デプロイする場合は `scripts/patch-worker.js` の各パッチで対処できる。
