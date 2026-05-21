# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このプロジェクトについて

FANZAアフィリエイトAPIを活用した**モバイルファーストのアフィリエイトサイト**。WordPress量産型が主流の市場に対し、アプリ寄りのUX（保存・通知・履歴・パーソナライズ）で差別化する。1人・自動化メインで運営する想定。

**コアコンセプト**: 入口はライトユーザー向けに広く（セール・スワイプ・診断）、継続利用でヘビーユーザー向けに深くなる（パーソナライズ・トラッカー・通知）。

## 開発コマンド

```bash
pnpm dev          # ローカル開発サーバー起動 (localhost:3000)
pnpm build        # Next.js ビルド（動作確認用）
pnpm lint         # ESLint
pnpm cf:build     # Cloudflare Pages 向けビルド（opennextjs-cloudflare）
pnpm cf:preview   # Cloudflare でローカルプレビュー
pnpm cf:deploy    # Cloudflare Pages へデプロイ
```

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js App Router + Server Components + TypeScript |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| ホスティング | Cloudflare Pages（opennextjs-cloudflare） |
| DB / 認証 | Supabase（お気に入り・スワイプ履歴・価格履歴・パスワード認証） |
| キャッシュ | Cloudflare KV（ISRキャッシュ） |
| 検索 | DMM API キーワード検索（外部サービス不要）+ nuqs URL管理 |
| PWA | manifest.json + Service Worker（プッシュ通知・オフラインキャッシュ） |
| 自動化 | Cloudflare Workers cron（価格監視・X自動投稿） |

## アーキテクチャ

### DMM API

- ベースURL: `https://api.dmm.com/affiliate/v3/`
- **`DMM_API_ID` と `DMM_AFFILIATE_ID` は絶対に `NEXT_PUBLIC_` を付けない**。ブラウザからのCORSは不可のため、必ず Server Components か Route Handler 経由でフェッチする
- `next/image` の remotePatterns に `pics.dmm.co.jp` / `pics.dmm.com` / `awsimgsrc.dmm.co.jp` の3ホストを登録済み
- **アフィリエイトID**: API用途では末尾 990〜997 のID（yoshihirock-990 〜 yoshihirock-997）を使用。末尾が 990〜999 以外はエラーになる
- **1リクエストあたりの最大取得件数**: 100件（`hits` パラメータの上限）。`offset` 最大値は 50000
- **クレジット表示必須**: FANZAコンテンツ利用時は規定のクレジット（`Powered by FANZA Webサービス` またはバナー画像）を全ページに表示する（`docs/dmm-affiliate-api-terms.md` 参照）
- **ActressSearch の制限**: `site` / `sort` / `offset` パラメータは非対応（送ると 400 エラー）。`lib/dmm/client.ts` の `fetchActressList` ではこれらを除外済み

#### 提供中 API エンドポイント一覧

| API | エンドポイント | 主なパラメータ | 概要 |
|-----|------------|-------------|------|
| 商品情報API v3 | `GET /ItemList` | site / service / floor / hits / offset / sort / keyword / cid / article / article_id / gte_date / lte_date | 商品一覧・詳細取得 |
| フロアAPI | `GET /FloorList` | — | サービス・フロア一覧取得 |
| 女優検索API | `GET /ActressSearch` | initial / actress_id / keyword / gte_bust〜lte_hip / gte_height〜lte_birthday | 女優情報・3サイズ等 |
| ジャンル検索API | `GET /GenreSearch` | floor_id（必須）/ initial / hits / offset | ジャンル一覧（フロア指定必須） |
| メーカー検索API | `GET /MakerSearch` | floor_id（必須）/ initial / hits / offset | メーカー一覧（フロア指定必須） |
| シリーズ検索API | `GET /SeriesSearch` | floor_id（必須）/ initial / hits / offset | シリーズ一覧（フロア指定必須） |
| 作者検索API | `GET /AuthorSearch` | floor_id（必須）/ initial / hits / offset | 作者一覧（フロア指定必須） |

#### ItemList ソート順

| 値 | 意味 |
|-----|------|
| `rank`（デフォルト） | 人気順 |
| `price` | 価格高順 |
| `-price` | 価格安順 |
| `date` | 発売日順 |
| `review` | 評価順 |
| `match` | キーワードマッチング順 |

#### article 絞り込み

`article` + `article_id` を組み合わせて特定女優・ジャンル・シリーズに絞り込める。`article_id` は各検索APIから取得する。

| article 値 | 絞り込み対象 |
|----------|-----------|
| `actress` | 女優 |
| `author` | 作者 |
| `genre` | ジャンル |
| `series` | シリーズ |
| `maker` | メーカー |

### レンダリング戦略

- トップ・カテゴリ一覧: ISR（`revalidate` 60〜3600秒）
- 上位1000商品の個別ページ: `generateStaticParams` で事前生成
- 残りの商品ページ: `dynamicParams = true` でオンデマンドISR
- 検索結果: `force-dynamic` のSSRまたはクライアントフェッチ

### 認証フロー

メールアドレス + パスワード認証（マジックリンクは廃止。Supabase 無料プランのメール送信上限 3通/時 を回避するため admin API で登録）。

- **新規登録**: `admin.auth.admin.createUser({ email_confirm: true })` でメール確認なしに確認済みユーザーを作成 → 即座に `signInWithPassword` でセッション確立
- **ゲスト**: LocalStorage でお気に入り5件・スワイプ履歴を管理
- **ログイン後**: LocalStorage のデータを Supabase に移行してからクリア
- **ゲートではなく誘導**: お気に入り6件目・スワイプ10枚後・通知ベルタップ時に登録を促す

### モバイルファースト実装ルール

- ナビゲーション: ボトムナビ5タブ固定（ホーム / 探す / お気に入り / 検索 / マイページ）
- 高さ: `vh` でなく `dvh` を使用（モバイルブラウザのアドレスバー対応）
- セーフエリア: `padding-bottom: env(safe-area-inset-bottom)` をボトムナビに適用
- タップターゲット: 最小44×44px
- 非同期コンポーネント: 必ずスケルトンUIを用意する
- お気に入りボタン: オプティミスティックUIで即時反映、失敗時ロールバック
- 動画: `IntersectionObserver` で画面内のみ再生、離れたら停止

## 主要機能の実装方針

### セール・ランキング（最優先）

独自スコア: `★平均 × log(レビュー件数) × 新しさ係数` でランキング生成。FANZA同人90%OFFクーポンは常時バナー固定。

### お気に入り・値下げ通知

価格監視は Cloudflare Workers cron（毎時）で DMM API → Supabase `price_history` テーブルと比較。値下がりを `sale_queue` に積み、1日3回の定時 cron で X API v2 へ投稿。

### X 自動投稿

- X Developer Account: Free プラン（月1500投稿上限、1日3回×最大3件×30日=最大270投稿で余裕あり）
- cron: UTC 22時/3時/11時（JST 7時/12時/20時）
- APIキーは `wrangler secret put` で Cloudflare 環境変数に登録
- 同一作品は72時間以内に再投稿しない。割引率10%未満はスキップ。1回の実行で最大3件まで
- OAuth 1.0a (HMAC-SHA1) を Web Crypto API のみで実装（外部ライブラリ不要）

### ゲーミフィケーション・バッジ・ポイント

金銭換算なしの独自バッジ（資金決済法の対象外）。毎日ログイン・お気に入り10件・シリーズ完走などでバッジ付与。将来的な独自ポイントへの移行は弁護士確認が必要。

- バッジ定義: `lib/badges.ts`（WELCOME / STREAK_3/7/30 / COLLECTOR_10/50 / SERIES_COMPLETE / REACTOR_10）
- 付与ロジック: `lib/badge-engine.ts`（サービスロールキーで RLS バイパス）
- **ポイント機能は現在停止中**: スキーマ・DB関数は存在するが付与ロジックをコメントアウト中。UIにも非表示。`lib/badge-engine.ts` のコメント1行を外すと再開できる

### シリーズ完走トラッカー

- `app/series/[id]/page.tsx` でシリーズ全巻一覧・進捗バー表示
- フォロー中シリーズは `followed_series` テーブルで管理
- 既読は `series_progress` テーブル（user_id / series_id / item_id / status）
- 新刊監視: `workers/series-monitor.ts`（毎朝9時 cron）→ `notification_queue` に追加

### パーソナライズ・レコメンド

- `lib/personalization.ts` でスワイプ履歴・お気に入りからジャンル/女優/メーカーのスコアを計算
- 右スワイプ/お気に入り = +2点、左スワイプ = -1点
- `app/api/recommend/route.ts` でスコア順のおすすめ商品・急上昇・女優新作を返す
- 閲覧履歴は `view_history` テーブル（`app/api/view/route.ts` で記録）

### PWA・プッシュ通知

- Service Worker: `public/sw.js`（オフラインキャッシュ・プッシュ受信）
- VAPID 鍵ペアが必要: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（公開）/ `VAPID_PRIVATE_KEY_JWK`（秘密・JWK形式）
- 推し女優日替わり通知フロー: daily-revalidate Worker（JST 0:01）→ `/api/oshi-notify` → `notification_queue` → push-notify Worker（15分ごと）→ Web Push 送信
- iOS Safari は PWA（ホーム画面追加済み）としての動作時のみ受信可能

## Next.js App Router ベストプラクティス

### Server Components / Client Components の境界

- **デフォルトはすべて Server Component**。`'use client'` はインタラクション・ブラウザAPI・フックが必要な最小単位のみに付ける
- Client Component はツリーの末端（リーフ）に押しやる。親を Server Component のまま保てばデータフェッチがサーバー側に残る
- Server Component から Client Component へ渡す props は**シリアライズ可能な値のみ**（関数・クラスインスタンス不可）

```tsx
// NG: ページ全体を Client Component にする
'use client'
export default function ProductPage() { ... }

// OK: データ取得は Server Component、操作部分だけ Client Component
export default async function ProductPage() {
  const product = await fetchProduct() // サーバーで実行
  return <ProductDetail product={product} /> // Client Component はここだけ
}
```

### ウォーターフォールの排除（CRITICAL）

独立したフェッチは必ず `Promise.all()` で並列実行する。直列 `await` は RTT が掛け算になる。

```tsx
// NG: 3回往復
const item = await fetchItem(id)
const actress = await fetchActress(id)
const related = await fetchRelated(id)

// OK: 1回往復
const [item, actress, related] = await Promise.all([
  fetchItem(id),
  fetchActress(id),
  fetchRelated(id),
])
```

### Suspense でストリーミング

ページ全体を `await` でブロックしない。遅いコンポーネントだけ `<Suspense>` で囲み、残りを先に表示する。

```tsx
// OK: ランキングが重くてもヘッダーとバナーは即表示
export default function SalePage() {
  return (
    <>
      <SaleBanner />          {/* 即表示 */}
      <Suspense fallback={<RankingSkeleton />}>
        <RankingSection />    {/* データ取得中はスケルトン */}
      </Suspense>
    </>
  )
}
```

`loading.tsx` はルート全体へのフォールバック。細かい粒度は `<Suspense>` で制御する。

### バンドルサイズ最適化（CRITICAL）

**barrel import の最適化**: `lucide-react` など大きなライブラリは `optimizePackageImports` で自動最適化する。

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}
```

**重いコンポーネントの動的インポート**: 初期表示に不要なコンポーネント（スワイプフィード・動画プレイヤー・診断UI等）は `next/dynamic` で遅延ロードする。

```tsx
import dynamic from 'next/dynamic'

const SwipeFeed = dynamic(() => import('@/components/SwipeFeed'), {
  ssr: false,
  loading: () => <SwipeSkeleton />,
})
```

### サーバー側のキャッシュと状態

**`React.cache()` でリクエスト内重複排除**: `fetch` 以外（Supabase クエリ・認証確認）は `React.cache()` でラップする。同一リクエスト内で何度呼んでも1回しか実行されない。

```ts
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const { data } = await supabase.auth.getUser()
  return data.user
})
```

**モジュールスコープに可変状態を置かない**: Server Components は並行レンダリングされる。モジュールレベルの変数にリクエスト固有データを入れると別ユーザーのデータが混入する。

```tsx
// NG: 並行リクエストで混入する
let currentUser: User | null = null
export default async function Page() {
  currentUser = await getCurrentUser()  // 危険
  return <Dashboard />
}

// OK: ローカル変数か props で渡す
export default async function Page() {
  const user = await getCurrentUser()
  return <Dashboard user={user} />
}
```

### データ更新は Server Actions

フォーム送信・お気に入り追加・スワイプ記録などのミューテーションは Route Handler ではなく Server Actions を使う。プログレッシブエンハンスメントが得られ、JS が無効でも動作する。

```tsx
// actions/favorites.ts
'use server'
export async function addFavorite(itemId: string) {
  const user = await getCurrentUser()
  await supabase.from('favorites').insert({ user_id: user.id, item_id: itemId })
  revalidatePath('/favorites')
}
```

### LocalStorage とハイドレーション

LocalStorage に依存する表示（ゲストお気に入り数・年齢確認状態）を `useEffect` で読むと、SSR との不一致でちらつきが発生する。インラインスクリプトで DOM を先に書き換える。

```tsx
// NG: useEffect で読むと hydration 後にちらつく
const [count, setCount] = useState(0)
useEffect(() => { setCount(JSON.parse(localStorage.getItem('favs') ?? '[]').length) }, [])

// OK: インラインスクリプトで先に DOM を確定させる
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    try {
      var n = JSON.parse(localStorage.getItem('favs')||'[]').length;
      document.getElementById('fav-count').textContent = n;
    } catch(e){}
  })();
`}} />
```

### 条件付きレンダリング

`&&` は `0` や `NaN` をそのまま描画するため、数値・配列長を条件にする場合は三項演算子を使う。

```tsx
// NG: count が 0 のとき "0" が表示される
{count && <Badge count={count} />}

// OK
{count > 0 ? <Badge count={count} /> : null}
```

### コンポーネントをコンポーネント内に定義しない

コンポーネント内でコンポーネントを定義すると、親が再レンダリングするたびに子が**アンマウント→マウント**される。フォーカス消失・エフェクト再実行・スクロールリセットが起きる。

```tsx
// NG: Avatar は UserProfile が描画されるたびに再マウント
function UserProfile({ user }) {
  const Avatar = () => <img src={user.avatarUrl} />  // 定義しない
  return <Avatar />
}

// OK: トップレベルで定義、必要な値は props で渡す
function Avatar({ src }: { src: string }) {
  return <img src={src} />
}
function UserProfile({ user }) {
  return <Avatar src={user.avatarUrl} />
}
```

### エラーハンドリング・メタデータ

- `error.tsx`: ルートレベルのエラーバウンダリ（`'use client'` 必須）
- `not-found.tsx`: 商品・女優ページが存在しない場合の404
- `generateMetadata`: 商品・女優ページで動的に OGP を生成する

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await fetchItem(params.id)
  return {
    title: item.title,
    openGraph: { images: [item.imageURL.large] },
  }
}
```

## Supabase テーブル一覧

| テーブル | 用途 | RLS |
|---------|------|-----|
| `profiles` | id / display_name / email / oshi_actress_id / oshi_actress_name / points | 本人のみ読み書き |
| `favorites` | お気に入り（item_id / item_title / image_url / price） | 本人のみ読み書き |
| `swipe_history` | スワイプ履歴（item_id / direction） | 本人のみ読み書き |
| `price_history` | 価格履歴（item_id / price / fetched_at） | 全員読み取り・書き込みはサービスロールのみ |
| `sale_queue` | X投稿キュー（item_id / original_price / sale_price / discount_rate / status） | サービスロールのみ |
| `user_badges` | バッジ付与記録（badge_type / earned_at） | 本人のみ読み取り・書き込みはサービスロールのみ |
| `user_points` | ポイント（amount / reason）— 現在停止中 | サービスロールのみ |
| `login_streaks` | 連続ログイン日数（current_streak / last_login_date） | サービスロールのみ |
| `notification_subscriptions` | Web Push 購読情報（endpoint / keys） | 本人のみ読み書き |
| `notification_queue` | 通知送信キュー（type / payload / status） | サービスロールのみ |
| `series_progress` | シリーズ既読（series_id / item_id / status） | 本人のみ読み書き |
| `followed_series` | フォロー中シリーズ（series_id / series_name / latest_item_id） | 本人のみ読み書き |
| `view_history` | 閲覧履歴（item_id / item_title / viewed_at） | 本人のみ読み書き |

DB関数（RPC）:
- `get_top_favorited_items(limit_count)` — お気に入り上位 N 件の item_id を返す
- `get_latest_prices(item_ids)` — 各 item_id の最新価格のみを返す（DISTINCT ON）
- `get_pending_sale_items(max_count)` — X投稿対象（pending・10%以上・72時間未投稿）を返す
- `increment_user_points(p_user_id, p_amount)` — ポイントをアトミックに加算（現在停止中）

## ドキュメント一覧

各機能の詳細実装仕様は `docs/` フォルダを参照:

| ドキュメント | 内容 |
|------------|------|
| `docs/001_supabase-setup.md` | Supabase 初期設定・DB設計・RLS |
| `docs/002_dmm-api-client.md` | DMM API クライアント・型定義・APIリファレンス |
| `docs/003_age-verification.md` | 年齢確認ゲート |
| `docs/004_auth.md` | 認証フロー（パスワード認証・新規登録・リセット） |
| `docs/005_mobile-layout.md` | モバイルレイアウト・ボトムナビ |
| `docs/006_sale-ranking.md` | セール・ランキング・日替わり商品・ベントーグリッド |
| `docs/007_favorites.md` | お気に入り機能 |
| `docs/008_price-monitor-cron.md` | 価格監視 Cloudflare Workers Cron |
| `docs/009_swipe-feed.md` | スワイプフィード・サンプル動画再生 |
| `docs/010_actress-hub.md` | 女優ハブ・ファセット検索・SEO |
| `docs/011_series-tracker.md` | シリーズ完走トラッカー |
| `docs/012_personalization.md` | パーソナライズ・レコメンド |
| `docs/013_gamification.md` | バッジ・ゲーミフィケーション・ポイント（停止中） |
| `docs/014_pwa-push.md` | PWA・Web Push 通知 |
| `docs/015_x-auto-post.md` | X（Twitter）自動投稿 |
| `docs/016_search-meilisearch.md` | 検索（DMM API キーワード検索） |
| `docs/dmm-affiliate-api-terms.md` | DMM アフィリエイト利用規約リファレンス |

## 法務・規約の絶対ルール

- **PR表記**: すべてのページのリンク近辺に「PR」または「広告」表記を入れる（景表法）
- **年齢確認ゲート**: FANZAコンテンツへのアクセスには必須。`middleware.ts` で `age_check_done=1` Cookie がない場合は `/age-check` へリダイレクト
- **画像改変禁止**: DMM公式提供素材への加工（モザイク・スタンプ・黒塗り）は規約違反
- **自己アフィリエイト禁止**: DMM規約で明示的に禁止
- **ソーシャルプルーフ**: 「○件購入」などの数値表示は必ず実データと連動させる（虚偽表示は景表法違反）

## Supabase + Next.js 実装ルール

### クライアントの使い分け（3種類）

用途に応じて必ず使い分ける。混在させない。

| ファイル | 用途 | パッケージ |
|---------|------|-----------|
| `lib/supabase/client.ts` | Client Component（ブラウザ） | `@supabase/supabase-js` |
| `lib/supabase/server.ts` | Server Component / Server Action | `@supabase/ssr` |
| `lib/supabase/middleware.ts` | middleware でのトークンリフレッシュ | `@supabase/ssr` |

```ts
// lib/supabase/server.ts の呼び出しパターン
// cookies() を必ず Supabase より先に呼ぶ（Next.js キャッシュから除外するため）
import { cookies } from 'next/headers'
const cookieStore = await cookies()
const supabase = createServerClient(url, key, { cookies: { ... } })
```

### middleware の役割

**Next.js 16 では `middleware.ts` が非推奨**。プロジェクトルートの `proxy.ts` を使用する（`middleware.ts` と両方存在するとエラー）。

```ts
// proxy.ts（middleware.ts ではなく）
export async function proxy(request: NextRequest) {
  return await updateSession(request) // lib/supabase/middleware.ts のロジック
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|icons/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- `request.cookies.set` → リフレッシュ済みトークンを Server Components に渡す
- `response.cookies.set` → 新トークンをブラウザに返す
- 年齢確認ゲート（`/age-check`）への振り分けもここで行う
- **matcher**: `sw.js` / `manifest.webmanifest` / `icons/` を除外（年齢確認リダイレクト対象外にするため）

### 認証の使い分け

```ts
// ページ保護・RLS のユーザー特定 → getClaims（トークン検証のみ、高速）
const { data: { claims } } = await supabase.auth.getClaims()

// 最新のユーザー情報が必要な場合 → getUser（ネットワーク呼び出しあり）
const { data: { user } } = await supabase.auth.getUser()

// 他サービスへのトークン転送時のみ → getSession
```

> **セキュリティ**: Server Component はcookieからセッションを取得するが、cookieは偽装可能。**データ保護は必ず RLS で行い、`getClaims` の結果だけを信頼する**。

### Row Level Security（RLS）

すべてのテーブルで RLS を有効化する。アプリ側での絞り込みだけでは不十分。

```sql
-- 例: favorites テーブル
alter table favorites enable row level security;
create policy "ユーザーは自分のお気に入りのみ操作可能"
  on favorites for all
  using (auth.uid() = user_id);
```

### React.cache() で認証を重複排除

同一リクエスト内で複数コンポーネントが `getCurrentUser()` を呼んでも1回だけ実行される。

```ts
// lib/supabase/server.ts
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { claims } } = await supabase.auth.getClaims()
  return claims
})
```

### 環境変数（Supabase）

Supabase の公開キーは `NEXT_PUBLIC_` を付けてよい（RLS で保護されているため）。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx  # 新形式
```

取得元: Supabase Dashboard → Settings → API Keys

---

## 環境変数

`.env.local`（コミット禁止）に記載。`.env.example` を参照。

```
# DMM API（サーバー専用 — NEXT_PUBLIC_ 厳禁）
DMM_API_ID=
DMM_AFFILIATE_ID=        # 末尾は -990 〜 -999

# Supabase（公開キーは NEXT_PUBLIC_ OK、RLS で保護）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # サーバー専用・絶対に公開しない

# X API（サーバー専用）
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

# PWA プッシュ通知（VAPID）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # base64url 形式の公開鍵（ブラウザに渡す）
VAPID_PRIVATE_KEY_JWK=          # JWK JSON 形式の秘密鍵（サーバー専用・公開禁止）
VAPID_SUBJECT=                  # mailto:your@email.com 形式

# ISR リバリデート認証
REVALIDATE_SECRET=              # openssl rand -hex 32 で生成

# サイトURL（サイトマップ・OGP等）
NEXT_PUBLIC_SITE_URL=           # 例: https://your-site.pages.dev
```

本番環境変数は `wrangler secret put <KEY>` で Cloudflare に登録する。

VAPID 鍵の生成方法:
```bash
node -e "
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
async function main() {
  const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pubRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const b64url = (buf) => Buffer.from(buf).toString('base64url');
  const privJwk = await subtle.exportKey('jwk', kp.privateKey);
  console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + b64url(pubRaw));
  console.log('VAPID_PRIVATE_KEY_JWK=' + JSON.stringify(privJwk));
}
main();
"
```
