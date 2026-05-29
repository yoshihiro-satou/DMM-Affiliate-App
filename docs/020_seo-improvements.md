# 020 SEO 改善ログ

> 実施日: 2026-05-28 / 更新: 2026-05-29（第3回）

---

## 実施済み

| 施策 | ファイル | 効果 |
|------|---------|------|
| ジャンルページ新規作成 | `app/genre/[id]/page.tsx` | ロングテール流入（「○○ジャンル おすすめ」等） |
| セール・シリーズに JSON-LD 追加 | `app/sale/page.tsx` / `app/series/[id]/page.tsx` | リッチリザルト対応 |
| ホームに内部リンク追加 | `app/page.tsx` | /sale・/actress へのクロールパス確保 |
| サイトマップに /genre・/discover 追加 | `app/sitemap.ts` | インデックス促進 |
| **ジャンルへの内部リンク 3箇所** | `app/page.tsx` / `app/actress/[id]/page.tsx` / `app/ranking/page.tsx` | トピッククラスター形成・クロール促進 |
| **404 バウンダリ追加** | `app/not-found.tsx` | CF Workers で `notFound()` が 500 になるバグ修正 |
| **女優ページ安定化** | `app/actress/[id]/page.tsx` / `app/ranking/page.tsx` | DMM API レート制限対策・CF Workers 500 完全排除 |
| **ジャンルページ安定化** | `app/genre/[id]/page.tsx` | `notFound()` 廃止・`GenreNotFound`/`GenreRetry` コンポーネントに置き換え |
| **ジャンル↔女優 逆方向リンク** | `app/genre/[id]/page.tsx` | 取得済み作品から女優集計・横スクロール＋作品数表示 |
| **ランキング「人気ジャンル」タブ** | `app/ranking/page.tsx` / `components/ranking/RankingTabs.tsx` | `period=genre` で上位20ジャンルをランク表示・`/genre/[id]` へ誘導 |

> ⚠️ **2026-05-29 時点で本番未デプロイ**（`pnpm cf:build && pnpm cf:deploy` 要実行）。  
> Playwright 検証済み：push 済みコードの動作は確認、デプロイ後に本番反映される。

**ジャンルページの実装ポイント:**
- `generateStaticParams` で上位50件を事前生成、残りは `dynamicParams = true` でオンデマンド ISR
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
- CF Workers では `notFound()` を呼んでも HTTP ステータスが 200 になるバグがある
- 対策: `notFound()` を使わず `return <XxxNotFound />` / `return <XxxRetry />` コンポーネントを返す
- **女優ページ**: `ActressNotFound` / `ActressRetry` ✅
- **ジャンルページ**: `GenreNotFound` / `GenreRetry` ✅（2026-05-29 追加）
- Playwright 検証: `/genre/99999` → HTTP 200 + `app/not-found.tsx` 表示を確認（旧コード動作）

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

---

## 次のアクション（優先順）

### 🔴 優先1：GSC「お宝キーワード」改善

**コスト極小・ROI最大。インデックス後 1〜2 週間で着手。**

1. GSC → 検索パフォーマンス → 「平均掲載順位」列を表示
2. 順位 10〜20 位のクエリを抽出
3. 該当ページの `title` / `description` / h1 を改善

**見込まれるお宝クエリ:**
- 「[女優名] おすすめ」→ 女優ページの description に固有文追加
- 「[ジャンル名] おすすめ FANZA」→ ジャンルページの h1 直下に1行説明追加
- 「FANZA セール 今日」→ /sale の title を「今日のFANZAセール・値引き作品」に変更

---

### 🔴 優先2：X 自動投稿（Cloudflare Cron）

**`X_API_KEY` は `.env.local` 設定済み。`workers/x-post.ts` + `wrangler.toml` cron を追加するだけ。**

熱量別テンプレート（拡散データ 5,100件の分析より、各熱量とも平均 6万 RT 以上）:

| 熱量 | Cron | テンプレート |
|------|------|------------|
| **WOW**（驚き・23%） | `5 0 * * *` 毎日0:05 | `🔥 本日限り【{割引率}%OFF】「{タイトル}」定価{定価}円→{価格}円 {/sale}` |
| **応援**（ファン・14%） | `0 12 * * *` 毎日12:00 | `{女優名} の新作来た🎉「{タイトル}」{/actress/id}` |
| **知っトク**（11%） | `0 20 * * 3` 水曜20:00 | `知ってた？FANZAのセールは毎日0時に切り替わる→深夜0時直後が一番お得 {/sale}` |

**フォーマット選択（データより）:**
- WOW/WANT → 画像必須（作品サムネ＋価格カード）
- 知っトク/あるある → テキストのみで「膝ポン感」を出す

**拡散の閾値:** 1RT ≒ 300インプレッション。1,300RT = 日本の全拡散ツイートの上位0.1%（「世の中ごと」の入口）。

---

### 🔴 優先3：動的 OGP 画像（`next/og`）

**SNS シェア時のクリック率 +45%（成功事例）。`app/genre/[id]/opengraph-image.tsx` を追加するだけ。**

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

| 追加元 | 追加先 | 状態 |
|--------|--------|------|
| ホームページ「ジャンルで探す」セクション | `/genre/[id]` チップ16件 | ✅ 本番反映済み |
| 女優ページ（作品から集計） | 出演ジャンル上位8件 | ✅ 本番反映済み |
| ランキングページ（作品から集計） | 人気ジャンル上位10件 | ✅ 本番反映済み |
| ジャンルページ → 女優ページ | 「関連女優」横スクロール上位8件・作品数表示 | 🔄 push済み・デプロイ待ち |
| ランキング「人気ジャンル」タブ | `/genre/[id]` ランキング形式20件 | 🔄 push済み・デプロイ待ち |

---

### 🟡 優先5：女優ページ description・h1 充実

現状は女優名のみ。固有文を追加するだけでロングテール流入が増える。

```ts
// 例: generateMetadata
description: `${actress.name}のFANZA作品一覧。全${totalCount}作品をレビュー順に掲載。`
```

---

### 🟡 優先6：バイラルシェアボタン（推し新作通知）

プッシュ通知受信後に女優ページへ遷移したユーザーが、ワンタップで X にシェアできる動線。
`twitter.com/intent/tweet` で定型文＋URL を埋め込むだけ（実装コスト小）。

```tsx
<a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
  `${actress.name} の新作来た🎉\n「${latestItem.title}」\n#FANZAピックス`
)}&url=${encodeURIComponent(url)}`}>
  Xでシェア
</a>
```

---

### 🟢 優先7：構造化データ追加（パンくず・FAQPage）

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

### 🟢 優先8：GEO 対策（AI 検索対応）

`public/llms.txt` を設置してAI検索エンジンにサイト概要を伝える（robots.txtのAI版として普及中）。
**注意:** アダルトコンテンツのためAIへの学習許可は慎重に判断すること。

---

## 効果測定チェックリスト（インデックス後 1〜2 週間）

| 確認項目 | 場所 |
|---------|------|
| ジャンルページのインデックス数 | GSC → ページ |
| お宝クエリ（10〜20位）の特定 | GSC → 検索パフォーマンス → 掲載順位でフィルタ |
| 構造化データエラー | GSC → エクスペリエンス → 構造化データ |
| X投稿のインプレッション・クリック数 | X Analytics |
