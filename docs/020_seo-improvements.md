# 020 SEO 改善ログ

> 実施日: 2026-05-28 / 更新: 2026-05-31（第6回）

---

## 実施済み

| 施策                                             | ファイル                                                                                       | 効果                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ジャンルページ新規作成                           | `app/genre/[id]/page.tsx`                                                                      | ロングテール流入（「○○ジャンル おすすめ」等）                                                                      |
| セール・シリーズに JSON-LD 追加                  | `app/sale/page.tsx` / `app/series/[id]/page.tsx`                                               | リッチリザルト対応                                                                                                 |
| ホームに内部リンク追加                           | `app/page.tsx`                                                                                 | /sale・/actress へのクロールパス確保                                                                               |
| サイトマップに /genre・/discover 追加            | `app/sitemap.ts`                                                                               | インデックス促進                                                                                                   |
| **ジャンルへの内部リンク 3箇所**                 | `app/page.tsx` / `app/actress/[id]/page.tsx` / `app/ranking/page.tsx`                          | トピッククラスター形成・クロール促進                                                                               |
| **404 バウンダリ追加**                           | `app/not-found.tsx`                                                                            | CF Workers で `notFound()` が 500 になるバグ修正                                                                   |
| **女優ページ安定化**                             | `app/actress/[id]/page.tsx` / `app/ranking/page.tsx`                                           | DMM API レート制限対策・CF Workers 500 完全排除                                                                    |
| **ジャンルページ安定化**                         | `app/genre/[id]/page.tsx`                                                                      | `notFound()` 廃止・`GenreNotFound`/`GenreRetry` コンポーネントに置き換え                                           |
| **ジャンル↔女優 逆方向リンク**                   | `app/genre/[id]/page.tsx`                                                                      | 取得済み作品から女優集計・横スクロール＋作品数表示                                                                 |
| **ランキング「人気ジャンル」タブ**               | `app/ranking/page.tsx` / `components/ranking/RankingTabs.tsx`                                  | `period=genre` で上位20ジャンルをランク表示・`/genre/[id]` へ誘導                                                  |
| ✅ **優先5：女優ページ description・作品数表示** | `app/actress/[id]/page.tsx`                                                                    | `generateMetadata` に作品数を追加・プロフィール欄に「FANZA動画 全XX作品」表示                                      |
| ✅ **CF Workers RSC ナビゲーション 500 修正**    | `components/actress/ActressCard.tsx` / `app/actress/[id]/WorkTabs.tsx` / `app/series/page.tsx` | `<Link>` → `<a>` に変更（動的ルートへの RSC リクエストが 500 になる CF Workers バグ回避）                          |
| ✅ **CF Workers React.cache() 500 修正**         | `app/actress/[id]/page.tsx` / `app/genre/[id]/page.tsx`                                        | モジュールスコープ `React.cache()` を通常の `async function` に変更（workerd の AsyncLocalStorage 非互換バグ修正） |
| ✅ **女優・ジャンルページ force-dynamic 化**     | `app/actress/[id]/page.tsx` / `app/genre/[id]/page.tsx`                                        | ISR 廃止 → SSR。ビルド時 API 失敗で静的ページ 0 件 → `DYNAMIC_SERVER_USAGE` 500 を恒久解消                         |
| ✅ **女優ページ OGP 画像（写真）**               | `app/actress/[id]/page.tsx`                                                                    | `openGraph.images` に DMM 提供の女優写真 URL を設定。SNS シェア時に写真が表示される                                |
| ✅ **素人フロア（videoc）サイト全体追加**        | `lib/dmm/client.ts` / `lib/dmm/floors.ts` / `app/page.tsx` / `app/discover/page.tsx` / `app/ranking/page.tsx` / `components/swipe/SwipeFeed.tsx` / `app/api/dmm/items/route.ts` | FloorList API で videoc(id=44) を確認。`fetchItemListMixed()` で videoa + videoc をインターリーブ。ホーム・探す・スワイプフィード・ランキング「素人」タブに反映 |
| ✅ **検索 VR 除外・全ソート素人混合**            | `lib/search.ts`                                                                                | キーワードなし時の全ソートを `fetchItemListMixed` に変更（人気順・新着順・評価順・価格順）。VR ジャンル付き作品をフィルタ除外 |

> ✅ **2026-05-30 時点で本番デプロイ済み**（Version ID: `6016f2c5`）  
> 本番確認: `/actress/1082666` HTTP 200 ✅ / `/genre/4026` HTTP 200 ✅

> ✅ **2026-05-31 時点で本番デプロイ済み**（素人フロア追加・検索 VR 除外）  
> FloorList API 確認: videoc(素人) id=44 / nikkatsu(成人映画) id=45 / anime(アニメ) id=46

**ジャンルページの実装ポイント（更新）:**

- `force-dynamic` (SSR) に変更。`generateStaticParams` + ISR はビルド時 API 失敗で 0 件になり `DYNAMIC_SERVER_USAGE` 500 が発生するため廃止
- ジャンル名は `result.items[0]?.iteminfo?.genre?.find(g => g.id === genreId)?.name` で逆引き（GenreSearch に単一取得がないため）
- `floor_id: '43'` = FANZA videoa フロアの固定ID

**内部リンクの実装詳細:**

- **ホーム**: `fetchGenreList` で16件取得 → Suspense でチップ表示（エラー時は非表示）
- **女優ページ**: 取得済み `works` からジャンルを集計（追加 API なし）→ 頻度順上位8件
- **ランキングページ**: 取得済み `items` からジャンルを集計（追加 API なし）→ 頻度順上位10件
- **ジャンルページ → 女優ページ**: 取得済み `items` から女優を集計（追加 API なし）→ 頻度順上位8件・横スクロール＋作品数バッジ

**ランキング「人気ジャンル」タブの実装詳細:**

- `fetchPopularGenres()`: `sort: 'rank'` で上位100作品取得 → ジャンル出現頻度を集計 → 上位20件
- UI: 順位番号（1位=金・2位=銀・3位=銅）＋ジャンル名 ＋ 相対バー ＋ 作品数 ＋ chevron
- 追加 API コール 0（作品データから派生）

**CF Workers `notFound()` 廃止方針（全ページ共通）:**

- CF Workers では `notFound()` を呼ぶと HTTP 500 "Internal Server Error" になるバグがある
- 対策: `notFound()` を使わず `return <XxxNotFound />` / `return <XxxRetry />` コンポーネントを返す
- **女優ページ**: `ActressNotFound` / `ActressRetry` ✅
- **ジャンルページ**: `GenreNotFound` / `GenreRetry` ✅
- **シリーズページ**: `SeriesNotFound` / `SeriesRetry` ✅（2026-05-30 追加）

**CF Workers `<Link>` RSC ナビゲーション バグ（2026-05-30 発見・修正）:**

- CF Workers では動的ルート（`[id]`）への RSC リクエスト（`Next-Router-State-Tree` ヘッダー付き）が HTTP 500 を返す
- Next.js `<Link>` はクライアントサイドナビゲーション（RSC リクエスト）を使用するため、動的ルートへの `<Link>` がすべて失敗していた
- 対策: 動的ルートへのリンクはすべて `<a>` タグ（ハードナビゲーション）に変更
- 影響箇所: `ActressCard` / `WorkTabs` / `SeriesListItem`

**CF Workers `React.cache()` バグ（2026-05-30 発見・修正）:**

- CF Workers (workerd) で `React.cache()` を**モジュールスコープ**で使うと、AsyncLocalStorage の非互換により Server Components render で HTTP 500 になる
- `fetchActressList` / `fetchItemList` など `lib/dmm/client.ts` 内の `React.cache()` は問題なし（後から判明: ページファイル内でのモジュールスコープ定義が問題）
- 対策: `actress/[id]/page.tsx` と `genre/[id]/page.tsx` の `const xxx = cache(async ...)` を通常の `async function` に変更
- `series/[id]/page.tsx` が問題なかった理由: モジュールスコープに `React.cache()` ラッパーを定義していないため

**女優ページ安定化の実装詳細（CF Workers 対応）:**

- `cache(actressId: number)` ラッパーで `generateMetadata` とページ本体の `fetchActressList` 呼び出しを1回に統合（3回→2回に削減）
- `Promise.resolve().then(...)` で CF Workers での同期的な例外も確実にキャッチ
- `notFound()` を `ActressNotFound` / `ActressRetry` コンポーネントに置き換え（CF Workers で `notFound()` が 500 になる問題を完全排除）
- ランキング女優取得を `Promise.all`（12並列）→ `fetchWithRateLimit`（150ms 直列）に変更しレート制限を回避

**検証:**

```bash
curl -s "https://fanzapicks.com/sitemap.xml" | grep "/genre/"
# Google Rich Results Test でジャンル・セール・シリーズページを検証
```

**素人フロア追加の実装詳細（2026-05-31）:**

- FloorList API で FANZA digital サービスのフロア一覧を確認: videoa(43) / videoc(44) / nikkatsu(45) / anime(46)
- `lib/dmm/floors.ts` にフロア定数を定義（FloorList 再確認不要）
- `fetchItemListMixed()`: videoa + videoc を `Promise.all` で並列 fetch し `content_id` でインターリーブマージ
- スワイプフィード無限スクロール（`floor=mixed`）: `realHits = ceil(hits/2)`・`realOffset = (offset-1)/2+1` で各フロアへマッピング
- `fetchDailySaleItems`（日替わりセール）は videoa 限定のまま維持（VR フィルタ・セール判定ロジックが videoa 依存のため）
- 検索: キーワードなし→`fetchItemListMixed`（全ソート）、キーワードあり→`fetchItemList`（service: digital のみ、全フロア横断）
- VR 除外: `item.iteminfo?.genre?.some(g => g.name?.includes('VR'))` で検索結果のみフィルタ

---

## 次のアクション（優先順）

### ✅ 優先1：GSC「お宝キーワード」改善 — **実装済み（2026-05-31）**

**コスト極小・ROI最大。インデックス後 1〜2 週間で着手。**

1. GSC → 検索パフォーマンス → 「平均掲載順位」列を表示
2. 順位 10〜20 位のクエリを抽出
3. 該当ページの `title` / `description` / h1 を改善

**見込まれるお宝クエリ:**

- 「[女優名] おすすめ」→ 女優ページの description に固有文追加
- 「[ジャンル名] おすすめ FANZA」→ ジャンルページの h1 直下に1行説明追加
- 「FANZA セール 今日」→ /sale の title を「今日のFANZAセール・値引き作品」に変更

---

### 🔴 優先2：X 自動投稿（Cloudflare Cron）　一旦中止

**`X_API_KEY` は `.env.local` 設定済み。`workers/x-post.ts` + `wrangler.toml` cron を追加するだけ。**

熱量別テンプレート（拡散データ 5,100件の分析より、各熱量とも平均 6万 RT 以上）:

| 熱量                    | Cron                   | テンプレート                                                                 |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| **WOW**（驚き・23%）    | `5 0 * * *` 毎日0:05   | `🔥 本日限り【{割引率}%OFF】「{タイトル}」定価{定価}円→{価格}円 {/sale}`     |
| **応援**（ファン・14%） | `0 12 * * *` 毎日12:00 | `{女優名} の新作来た🎉「{タイトル}」{/actress/id}`                           |
| **知っトク**（11%）     | `0 20 * * 3` 水曜20:00 | `知ってた？FANZAのセールは毎日0時に切り替わる→深夜0時直後が一番お得 {/sale}` |

**フォーマット選択（データより）:**

- WOW/WANT → 画像必須（作品サムネ＋価格カード）
- 知っトク/あるある → テキストのみで「膝ポン感」を出す

**拡散の閾値:** 1RT ≒ 300インプレッション。1,300RT = 日本の全拡散ツイートの上位0.1%（「世の中ごと」の入口）。

---

### ⚠️ 優先3：動的 OGP 画像（`next/og`） — **CF Workers 非対応のため保留**

**`next/og` は `@vercel/og` の `resvg.wasm` / `yoga.wasm` を使用するため CF Workers (wrangler) でデプロイ不可。**

- `opengraph-image.tsx` を追加すると wrangler が WASM ファイルのバンドルに失敗しデプロイエラー
- 代替案: satori (純 JS) で SVG 生成は可能だが PNG 変換に WASM が必要（同問題）
- **現状対応**: 女優ページのみ `openGraph.images` で DMM 提供写真を使用（Twitter/X は HTTP URL 非対応）
- **将来対応**: Cloudflare Images + 静的 PNG 事前生成、または WASM バインディング対応を待つ

<!-- 以下は実装可能になった場合のサンプルコード（現在は使用不可） -->

```ts
// app/genre/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // genreName 取得 → 画像生成
  return new ImageResponse(
    <div style={{ background: '#1a0a0a', color: 'white', width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, fontWeight: 900 }}>{genreName} おすすめ作品</div>
      <div style={{ fontSize: 24, color: '#f87171', marginTop: 16 }}>FANZAピックス</div>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

対象: `/genre/[id]`（優先）→ `/actress/[id]`（次）

---

### ✅ 優先4：ジャンル↔女優 内部リンク（トピッククラスター）— **実装済み・デプロイ待ち**

ジャンル↔女優の相互リンクをすべて実装。加えてランキングにジャンルタブを追加。

| 追加元                                   | 追加先                                      | 状態            |
| ---------------------------------------- | ------------------------------------------- | --------------- |
| ホームページ「ジャンルで探す」セクション | `/genre/[id]` チップ16件                    | ✅ 本番反映済み |
| 女優ページ（作品から集計）               | 出演ジャンル上位8件                         | ✅ 本番反映済み |
| ランキングページ（作品から集計）         | 人気ジャンル上位10件                        | ✅ 本番反映済み |
| ジャンルページ → 女優ページ              | 「関連女優」横スクロール上位8件・作品数表示 | ✅ 本番反映済み |
| ランキング「人気ジャンル」タブ           | `/genre/[id]` ランキング形式20件            | ✅ 本番反映済み |

---

### ✅ 優先5：女優ページ description・h1 充実 — **実装済み・本番反映済み**

- `generateMetadata` に作品数（`hits:1` で `total_count` のみ取得）と3サイズを追加
- プロフィールヘッダーに「FANZA動画 全XX作品」を表示
- description 例: `「女優名のFANZA作品一覧。全123作品。B85 W58 H87 身長162cm。最新作・人気作をレビュー順に掲載。」`

---

### ✅ 優先6：バイラルシェアボタン（推し新作通知）— **実装済み**

プッシュ通知受信後に女優ページへ遷移したユーザーが、ワンタップで X にシェアできる動線。
`twitter.com/intent/tweet` で定型文＋URL を埋め込むだけ（実装コスト小）。

```tsx
<a
  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${actress.name} の新作来た🎉\n「${latestItem.title}」\n#FANZAピックス`,
  )}&url=${encodeURIComponent(url)}`}
>
  Xでシェア
</a>
```

---

### ✅ 優先7：構造化データ追加（パンくず・FAQPage）— **実装済み**

```ts
// BreadcrumbList — 全コンテンツページに追加
{ '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://fanzapicks.com' },
  { '@type': 'ListItem', position: 2, name: genreName },
]}

// FAQPage — ジャンルページに追加（AI Overviews への引用率向上）
{ '@type': 'FAQPage', mainEntity: [{
  '@type': 'Question',
  name: `${genreName}とはどんなジャンルですか？`,
  acceptedAnswer: { '@type': 'Answer', text: `FANZAで人気の${genreName}作品を集めています。` },
}]}
```

---

### ✅ 優先8：GEO 対策（AI 検索対応）— **実装済み**

`public/llms.txt` を設置してAI検索エンジンにサイト概要を伝える（robots.txtのAI版として普及中）。
**注意:** アダルトコンテンツのためAIへの学習許可は慎重に判断すること。

---

## 効果測定チェックリスト（インデックス後 1〜2 週間）

| 確認項目                            | 場所                                          |
| ----------------------------------- | --------------------------------------------- |
| ジャンルページのインデックス数      | GSC → ページ                                  |
| お宝クエリ（10〜20位）の特定        | GSC → 検索パフォーマンス → 掲載順位でフィルタ |
| 構造化データエラー                  | GSC → エクスペリエンス → 構造化データ         |
| X投稿のインプレッション・クリック数 | X Analytics                                   |
