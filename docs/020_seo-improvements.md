# 020 SEO 改善実装ログ

> 実施日: 2026-05-28（第4〜5セッション）

---

## 概要

WordPress 量産型サイトが支配するロングテール検索（「○○ジャンル おすすめ」等）に対し、
大量のジャンルページ自動生成・構造化データ・内部リンク強化で差別化する。

---

## 実施内容

### ① ジャンルページ新規作成（効果大）

**狙い:** 「中出し おすすめ」「美少女 作品」など、**ジャンル名 × 「おすすめ」** のロングテール検索流入。

**新規ファイル:** `app/genre/[id]/page.tsx`

| 機能 | 実装内容 |
|------|---------|
| `generateStaticParams` | `fetchGenreList` で上位50ジャンルを事前静的生成 |
| `dynamicParams = true` | 残りのジャンルはオンデマンド ISR（初回アクセス時に生成） |
| `generateMetadata` | `title: "${ジャンル名} おすすめ作品"` / canonical / OGP |
| ページ本体 | `fetchItemList({ article: 'genre', sort: 'review', hits: 40 })` でレビュー順取得 |
| JSON-LD | `ItemList` schema（上位10件） |

**ジャンル名の取得方法（GenreSearch に単一取得がないため）:**
```ts
const genreName =
  result.items[0]?.iteminfo?.genre?.find((g) => g.id === genreId)?.name ?? `ジャンル${genreId}`
```

**`React.cache()` によるリクエスト重複排除:**
`fetchItemList` は `React.cache()` でラップ済みのため、`generateMetadata` とページ本体で同じパラメータを呼んでも HTTP リクエストは 1 回のみ。

---

### ② セールページに JSON-LD 追加（効果小・コスト極小）

**ファイル:** `app/sale/page.tsx`

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'セール・値引き作品',
  itemListElement: items.slice(0, 10).map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.title,
    url: item.affiliateURL,
  })),
}
```

Google がリッチリザルト（カルーセル等）でページ内容を認識できるようになる。

---

### ③ シリーズページに JSON-LD 追加（効果小・コスト極小）

**ファイル:** `app/series/[id]/page.tsx`

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CreativeWorkSeries',
  name: seriesName,
  numberOfEpisodes: totalCount,
  url: `${SITE_URL}/series/${id}`,
  ...(thumbnail ? { image: thumbnail } : {}),
}
```

`ItemList` ではなく `CreativeWorkSeries` を使うことで、Google がシリーズ構造を正確に認識する。

---

### ④ ホームページの内部リンク強化

**ファイル:** `app/page.tsx`

| 追加箇所 | リンク先 | 効果 |
|---------|---------|------|
| 「今日だけの特別価格」セクション右上 | `/sale` 「セール一覧 →」 | /sale へのクロールパス確保 |
| ホーム下部に「人気女優」セクション追加 | `/actress` 「女優一覧 →」 | /actress へのクロールパス確保 |

BottomNav だけでは Google がナビリンクと認識しにくいため、本文中のテキストリンクで補強。

---

### ⑤ サイトマップ更新

**ファイル:** `app/sitemap.ts`

**追加内容:**

| 追加ルート | priority | changeFrequency |
|-----------|---------|----------------|
| `/discover` | 0.7 | daily |
| `/genre/{id}` × 最大100件 | 0.7 | weekly |

**実装:**
```ts
const [actressResult, itemResult, genreResult] = await Promise.all([
  fetchActressList({ hits: 100, sort: 'id' }).catch(() => null),
  fetchItemList({ sort: 'rank', hits: 100, ... }).catch(() => null),
  fetchGenreList({ floor_id: '43', hits: 100 }).catch(() => null),  // 追加
])
```

---

### ⑥ 型定義・クライアント追加

**`types/dmm.ts`** — `DmmGenreSchema` / `DmmGenreResponseSchema` / `DmmGenre` 型を追加

**`lib/dmm/client.ts`** — `fetchGenreList(params)` を追加

```ts
export const fetchGenreList = cache(
  async (params: FetchGenreListParams = {}): Promise<DmmGenreResponse['result']> => {
    const searchParams = buildParams({
      floor_id: params.floor_id ?? '43',  // '43' = FANZA videoa フロア
      hits: params.hits ?? 100,
      ...
    })
    const res = await fetch(`${BASE_URL}/GenreSearch?${searchParams}`)
    ...
  }
)
```

`floor_id: '43'` は FANZA 動画（videoa）フロアの ID。`FloorList` API で確認済み。

---

## 検証方法

```bash
# ジャンルページ確認（APIクォータ回復後）
curl -b "age_check_done=1" "https://fanzapicks.com/genre/5001"

# JSON-LD が含まれるか確認
curl -s -b "age_check_done=1" "https://fanzapicks.com/genre/5001" | grep "application/ld+json"
curl -s -b "age_check_done=1" "https://fanzapicks.com/sale" | grep "application/ld+json"

# サイトマップにジャンルルートが含まれるか確認
curl -s "https://fanzapicks.com/sitemap.xml" | grep "/genre/"
```

Google Rich Results Test:
- https://search.google.com/test/rich-results でジャンル・セール・シリーズページをそれぞれ検証

---

## 効果測定（1〜4週間後）

Search Console で以下を確認：

| 確認項目 | 場所 |
|---------|------|
| ジャンルページのインデックス登録 | GSC → ページ → インデックス登録済み |
| ジャンルページのクリック・表示回数 | GSC → 検索結果パフォーマンス → ページ |
| 構造化データエラー | GSC → エクスペリエンス → 構造化データ |

---

## 積み残し・今後の展開（実装済み分から派生）

| タスク | 優先度 | 内容 |
|--------|--------|------|
| 女優ページの説明文充実 | 🟡 中 | 現状は女優名 + 商品一覧のみ。固有の description / h1 でロングテール狙い |
| メーカーページ | 🟢 低 | `/maker/[id]` をジャンルページと同パターンで作成 |
| パンくずリスト JSON-LD | 🟢 低 | `BreadcrumbList` schema を各ページに追加 |
| ジャンルページのページネーション | 🟢 低 | 現状 40 件固定。`/genre/[id]?page=2` で拡張可能 |

---

## 追加で実施できる SEO 施策（戦略文書より）

> 参照: `SEOとサイト育成・拡散戦略.md`（2026-05-28 作成）

---

### A. 構造化データの拡充（効果大・E-E-A-T強化）

#### A-1. パンくずリスト（BreadcrumbList）

全コンテンツページに追加すると Google がサイト階層を正確に認識しリッチリザルトに表示される。

```ts
// ジャンルページの例
const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://fanzapicks.com' },
    { '@type': 'ListItem', position: 2, name: 'ジャンル', item: 'https://fanzapicks.com/genre' },
    { '@type': 'ListItem', position: 3, name: genreName },
  ],
}
```

対象ページ: `/genre/[id]` / `/actress/[id]` / `/series/[id]` / `/ranking` / `/sale`

#### A-2. 女優ページに Person schema

女優ページに `Person` schema を追加すると Knowledge Panel 候補になる。

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: actress.name,
  ...(actress.imageURL?.large ? { image: actress.imageURL.large } : {}),
  url: `https://fanzapicks.com/actress/${actress.id}`,
}
```

#### A-3. FAQPage schema（ジャンルページ）

「○○ジャンルとは？」「おすすめ作品は？」などの FAQ セクションを追加して FAQPage schema を埋め込む。
AI Overviews（Google の AI 検索要約）に引用される確率が大幅に上がる。

```ts
const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: `${genreName}とはどんなジャンルですか？`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${genreName}は FANZAで人気の作品ジャンルです。レビュー評価の高い${result.total_count}件以上の作品があります。`,
      },
    },
  ],
}
```

---

### B. GEO 対策（AI 検索エンジン対応）

2026年は Google AI Overviews・ChatGPT Search・Perplexity など AI が検索結果を生成する時代。
クローラーがコンテンツを正確に取り込めるよう対応する。

#### B-1. `llms.txt` の設置

AI エージェント向けのサイト概要ファイル。`robots.txt` の AI 版として普及中。

```
# public/llms.txt
# FANZAピックス — FANZA アフィリエイトサイト

> FANZAの人気作品ランキング・セール情報・推し女優の新着を提供するキュレーションサイト。

## 主要ページ
- /ranking : 今週の人気ランキング
- /sale : セール・値引き作品
- /actress : 女優一覧
- /genre/[id] : ジャンル別おすすめ作品
- /series/[id] : シリーズ完走トラッカー
```

#### B-2. `robots.txt` で AI クローラーを明示許可

現在の設定を確認し、GPTBot・ClaudeBot・PerplexityBot を明示的に許可する。

```
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

**注意:** アダルトコンテンツのため、AI に学習させることの是非は慎重に判断すること。
許可する場合はコンテンツページ（`/genre/`・`/ranking`）のみに限定する方針も検討。

---

### C. 「お宝キーワード」グロースハック（GSC×GA4 連携）

#### C-1. 掲載順位 10〜20 位のキーワード改善

GSC でインデックス後 1〜2 週間経ったら以下の手順で確認・改善する。

1. GSC → 検索パフォーマンス → 「平均掲載順位」列を表示
2. 順位 10〜20 位のクエリを抽出（クリック数 0 でも表示回数があれば対象）
3. 該当クエリに対応するページの `title` / `description` を改善
4. ページ冒頭の h1・リード文にキーワードを自然に含める

**FANZAピックスで見込まれる「お宝クエリ」例:**
- 「[女優名] 新作」「[女優名] おすすめ」→ 女優ページの description 充実
- 「[ジャンル名] おすすめ FANZA」→ ジャンルページの h1・説明文追加
- 「FANZA セール 今日」→ /sale ページの title・description の鮮度向上

#### C-2. 高流入・低エンゲージメントページの改善

GA4 → エンゲージメント → ページとスクリーンで「平均エンゲージメント時間が短いのに流入が多いページ」を特定し、以下を改善する。

- ページ冒頭に「このページでわかること」を追加
- 関連ジャンル・関連女優への内部リンクを追加してページ回遊を促進
- スケルトン UI の表示時間が長い場合はプリロードを検討

---

### D. 内部リンク強化（トピッククラスター設計）

現状は各ページが孤立しがち。ジャンル・女優・シリーズを相互に繋ぐことで Google が「専門性のあるドメイン」と認識しやすくなる。

#### 推奨リンク追加箇所

| 追加元ページ | 追加先 | アンカーテキスト例 |
|------------|--------|----------------|
| 女優ページ `/actress/[id]` | 出演ジャンルの `/genre/[id]` | 「○○ジャンルの人気作品を見る」 |
| ジャンルページ `/genre/[id]` | 出演女優の `/actress/[id]` | 「このジャンルの人気女優」 |
| 商品詳細ページ | `/series/[id]`（シリーズもの） | 「シリーズをまとめて見る」 |
| `/ranking` | 上位ジャンルの `/genre/[id]` | 「○○ジャンルをもっと見る」 |

---

### E. 動的 OGP 画像の生成（SNS 拡散率向上）

現状は `public/og/default.png` の共通画像のみ。ページごとの固有 OGP 画像があると
SNS シェア時のクリック率（CTR）が大幅に上がる（成功事例で +45%）。

#### 実装方針

Next.js の `ImageResponse`（`next/og`）を使って動的生成する。

```ts
// app/genre/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export default async function OGImage({ params }: { params: { id: string } }) {
  // genreName を取得して画像を生成
  return new ImageResponse(
    <div style={{ background: '#1a0a0a', color: 'white', ... }}>
      <p>{genreName} おすすめ作品</p>
      <p>FANZAピックス</p>
    </div>,
    { width: 1200, height: 630 }
  )
}
```

対象: `/genre/[id]` / `/actress/[id]`（作品画像を背景に使うと視覚的インパクト大）

---

### F. X（Twitter）自動投稿 ×「拡散の科学」SNS 流入戦略

> 参照: `kakusan_no_kagaku_summary.md`（Twitter 拡散データ 5,100件の定量分析）

`X_API_KEY` は `.env.local` に設定済み。Cloudflare Cron で定期投稿を設定することで
SNS からの自然流入とブランド認知を底上げできる。

#### F-1. 拡散の閾値と目標設定

| 指標 | 数値 | 意味 |
|------|------|------|
| 1RT あたりの波及 | 約 300 インプレッション | 10RT = 約3,000人にリーチ |
| 「バズ」の入口 | **1,300 RT以上** | 日本の全拡散ツイートの上位 0.1% |
| 感情系熱量の平均 RT | **62,000 RT以上**（6万超） | インセンティブ以外でも十分バズる |

→ まず「1,300 RT 到達」を科学的に狙う設計にする。

#### F-2. FANZAピックスに使える「6つの熱量」マッピング

| 熱量 | シェア | 平均RT | 波形 | FANZAピックスでの使い方 |
|------|--------|--------|------|----------------------|
| **WOW（驚き）** | 23% | 65K | パルス | 「定価5,000円 → 本日限り980円」価格破壊セール告知 |
| **FUN（面白い）** | 23% | 66K | パルス | 「タイトルだけだと全然わからないシリーズ名まとめ」的なネタ投稿 |
| **知っトク** | 11% | 62K | パルス | 「FANZAポイント還元の裏技」「セール見逃さない方法」ライフハック |
| **応援（ファン活動）** | 14% | 69K | スパイク | 「○○（女優名）の新作来た！」推しファンへの届け |
| **WANT（物欲）** | 2% | 66K | パルス | 作品画像＋価格で「これ欲しい」と思わせる。画像が必須（61%） |
| **あるある（共感）** | 8% | 66K | パルス | 「セール終わり際に気づくやつ」日常共感テキスト |

**優先熱量:** WOW（日替わりセール）・応援（女優新着）・知っトク（FANZA豆知識）

#### F-3. クリエイティブ設計（フォーマット選択）

熱量によって最適なフォーマットが異なる。

| 熱量 | 最適フォーマット | FANZAピックスでの実装 |
|------|---------------|-------------------|
| WOW・WANT | **画像（61%）** | 作品サムネ＋価格カード（OGP 1200×630） |
| 応援・FUN・癒し | **動画（37〜46%）** | 作品サンプル動画のキャプ or GIF |
| 知っトク・物申す・同調 | **テキストのみ（24〜43%）** | 文章だけで「膝ポン感」を出す |

#### F-4. 投稿テンプレート（熱量別）

**WOW（日替わりセール）:**
```
🔥 本日限り【89%OFF】

「{タイトル}」
定価 {list_price}円 → {price}円

セール終了まであと{時間}
👇 見逃すな
{/sale URL}
```

**応援（女優新着）:**
```
{女優名} の新作が来た 🎉

「{タイトル}」

/{actress/id} で作品一覧チェック👇
{URL}
```

**知っトク（ライフハック）:**
```
知ってた？FANZAのセールは毎日0時に切り替わる

→ つまり深夜0時直後が一番お得な商品が揃ってる

今日のセール一覧はこちら👇
{/sale URL}
```

#### F-5. 投稿スケジュール（Cloudflare Cron）

| 投稿タイプ | Cron 設定 | 狙う熱量 |
|-----------|----------|---------|
| 日替わりセール | `5 0 * * *`（毎日 0:05 JST） | WOW |
| 週間ランキング | `0 9 * * 1`（毎週月曜 9:00） | 知っトク |
| 女優新着 | `0 12 * * *`（毎日 12:00、新作あれば） | 応援 |
| FANZA豆知識 | `0 20 * * 3`（毎週水曜 20:00） | 知っトク / あるある |

**実装:** `workers/x-post.ts` を作成し `wrangler.toml` に cron トリガーを追加。

#### F-6. 拡散 → 被リンク獲得（SEO への還元）

X でバズが起きると専門ブロガー・比較メディアがコンテンツを発見し自然被リンクを設置する。
フォロワー数より**業界関連アカウント（アニメ・アダルト系まとめサイト管理者等）にリーチできるか**が重要。

---

### H. バイラルループ設計（拡散の科学 × FANZAピックス）

> 参照: `kakusan_no_kagaku_summary.md`

サイト内にユーザーが自発的にシェアしたくなる仕組みを埋め込む。

#### H-1. 「推し女優の新作通知」をシェアトリガーに使う

プッシュ通知を受けたユーザーが「推し新作来た！」とそのままXにシェアできる動線を作る。

```
通知受信
  → 女優ページ /actress/[id] を開く
  → 「Xでシェア」ボタン（ワンタップ）
  → 定型文＋URL が入力済みで投稿画面が開く
```

定型文例:
```
{女優名} の新作来た！🎉
「{タイトル}」

#FANZAピックス
{URL}
```

**実装:** `<a href="https://twitter.com/intent/tweet?text=...&url=...">` をシェアボタンとして追加。

#### H-2. 「本日のセール」OGP カードで WANT 熱量を刺激

`/sale` を X でシェアした際に表示される OGP 画像に「今日だけ ○○% OFF」を動的に入れる。
ユーザーがシェアするだけで WOW/WANT 熱量の投稿が自動生成される。

```ts
// app/sale/opengraph-image.tsx
// 当日のセール割引率トップの作品を背景に表示
// 「本日限り 89% OFF」テキストを重ねる
```

#### H-3. スワイプ結果のシェア（参加性の設計）

スワイプフィード `/discover` で「○○本スワイプして○ジャンルが好きとわかった」という
診断結果を X にシェアできるようにする。「参加性」により自発的な拡散が生まれる。

```
「FANZAピックスで50本スワイプしたら
 #中出し 系が好きとわかった」

#FANZAピックス 診断はこちら👇
https://fanzapicks.com/discover
```

---

### G. Core Web Vitals 改善

現状の制約と対策。

| 指標 | 現状 | 目標 | 対策 |
|------|------|------|------|
| LCP | age-check ページで 4.5 秒 | 2.5 秒以内 | Route Group でルートレイアウト分割（age-check からフォント除外）|
| INP | 未計測 | 200ms 未満 | お気に入りボタンのオプティミスティック UI は実装済み。SwipeFeed の動的インポートも実施済み |
| CLS | 未計測 | 0.1 未満 | `next/image` で width/height 指定済み。問題が出た場合は画像コンテナにアスペクト比を明示 |

**実コンテンツページの CWV 計測方法:**
年齢確認後に Chrome DevTools → Lighthouse で `/ranking` を計測。
PSI（PageSpeed Insights）は age-check ページを計測するため参考にならない。
