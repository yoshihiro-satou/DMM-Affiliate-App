# 009 スワイプフィード

## 概要
カード型の1画面1作品スワイプフィード。サンプル動画（直接MP4）をコントロール付きで表示し、左右スワイプでスキップ/お気に入りを判定。スワイプ履歴を学習してパーソナライズ推薦につなげる。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト
- 007 お気に入り

---

## カードレイアウト（現行）

```
┌──────────────────────────────┐  ← inset-x-4 + rounded-2xl（max-w-[480px] 内）
│  [動画 URL由来アスペクト比]   │  ← shrink-0、タッチでドラッグ開始しない
│  LIKE ←stamp→ SKIP           │  ← ドラッグ中のみ表示（opacity が変化）
├──────────────────────────────┤
│  女優名                       │  ← 情報エリア（flex-1、スワイプゾーン）
│  タイトル（2行）              │
│  ¥価格  メーカー              │
│  ★レビュー  発売日            │
│  [ジャンルタグ]               │
│  [サンプル画像ストリップ]     │  ← 横スクロール thumbnails (h-14)
│  [  FANZAで見る  ] ← mt-auto │  ← アフィリエイトCTA（下部固定）
└──────────────────────────────┘
```

### 配置

```
top:    env(safe-area-inset-top, 0px) + 14px + stackIdx × 6px
bottom: 64px + env(safe-area-inset-bottom) + (8 - stackIdx × 2)px
maxHeight: 680px   ← iPad・デスクトップで情報エリアが過大にならないよう上限
```

後ろのカードは `top` を +6px、`bottom` を −2px ずつずらしてスタックがのぞく視覚効果。  
スケール: `1 - stackIdx × 0.035`

### デスクトップ対応

全デバイスでモバイル見た目に統一するため、カードスタックを `max-w-[480px] mx-auto` の wrapper で中央寄せ。  
`absolute inset-x-4` は wrapper 内で解決されるため、1440px 画面でも ≤ 448px 幅に収まる。

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `app/discover/page.tsx` | Server Component、初期データ取得 |
| `app/discover/SwipeFeedClient.tsx` | `next/dynamic` + `ssr:false` でラップ |
| `components/swipe/SwipeFeed.tsx` | カードスタック・スワイプロジック |
| `components/swipe/SampleVideoPlayer.tsx` | 動画/画像表示コンポーネント |

---

## SampleVideoPlayer 実装詳細

### 動画URL解決フロー

```
sampleMovieURL.size_* (DMM litevideo プレイヤーページURL)
  ↓ toDirectMp4() で変換
https://cc3001.dmm.co.jp/litevideo/freepv/{c1}/{c3}/{cid}/{cid}_sm_w{w}h{h}.mp4
  ↓ onError 時
<iframe src={playerUrl} /> （フォールバック）
  ↓ sampleMovieURL なし
sampleImageURL のスライドショー or imageURL 静止画
```

### 画面幅によるURL選択（pickPlayerUrl）

`window.innerWidth` を直接参照して最適サイズを選択する。

| 画面幅 | 優先URL |
|-------|--------|
| ≤ 476px | size_476_306 → 560 → 644 → 720 |
| ≤ 560px | size_560_360 → 644 → 720 → 476 |
| ≤ 644px | size_644_414 → 720 → 560 → 476 |
| それ以上 | size_720_480 → 644 → 560 → 476 |

### アスペクト比の取得（parseUrlSize）

プレイヤーURLの `size=W_H` パラメータからアスペクト比を動的に取得する。ハードコードしない。

```ts
function parseUrlSize(playerUrl: string): { w: number; h: number } {
  const m = playerUrl.match(/size=(\d+)_(\d+)/)
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 4, h: 3 }
}
```

DMM動画の実際のサイズ例:

| URL パラメータ | アスペクト比 |
|---|---|
| size=476_306 | 476:306 ≈ 1.556:1 |
| size=560_360 | 560:360 ≈ 1.556:1 |
| size=644_414 | 644:414 ≈ 1.556:1 |
| size=720_480 | 720:480 = 1.5:1 |

### 直接MP4 URLパターン

```
cid = mizd00432
c1  = "m"（cid[0]）
c3  = "miz"（cid.slice(0, 3)）
size = 476_306

→ https://cc3001.dmm.co.jp/litevideo/freepv/m/miz/mizd00432/mizd00432_sm_w476h306.mp4
```

確認済みで HTTP 200 を返す: mizd00432, snos00037, 1start00373, mird00253

### video 要素の属性

```tsx
<video
  key={item.content_id}
  src={directMp4}
  autoPlay
  muted
  playsInline
  controls
  className="w-full bg-black"
  style={{ aspectRatio: `${w}/${h}` }}   // URL由来の比率
  onError={() => setUseFallbackIframe(true)}
/>
```

- `aspectRatio` は `parseUrlSize()` で取得した値を使用（`aspect-[3/2]` のハードコードは廃止）
- `loop` は**付けない**（通常再生長でそのまま終了）
- `pointer-events-none` は**付けない**（コントロールが操作できなくなるため）
- 作品が変わるたびに `useFallbackIframe` を `false` にリセット

---

## SwipeFeed / SwipeCard 実装詳細

### 動画エリアとドラッグの分離

動画コントロール（タップ再生・シーク）とカードスワイプが競合しないよう、動画ラッパーに `onPointerDown` でイベント伝搬を止める。

```tsx
<div
  className="relative w-full shrink-0"
  onPointerDown={isTop ? (e) => e.stopPropagation() : undefined}
  style={{ touchAction: 'auto' }}   // motion.div の touchAction:'none' を上書き
>
  <SampleVideoPlayer item={item} isActive={isTop} />
</div>
```

- `shrink-0` で動画エリアは圧縮されない
- 情報エリアは `flex-1` で残り高さをすべて占有

### スワイプ判定

| ジェスチャー | 処理 |
|------------|------|
| 右スワイプ (x > 80px) | LIKE・お気に入り追加 |
| 左スワイプ (x < -80px) | SKIP |

```tsx
// ドラッグ完了後のアニメーション
await animate(x, 700, { type: 'tween', duration: 0.25 })  // 右
await animate(x, -700, { type: 'tween', duration: 0.25 }) // 左
// キャンセル
animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 })
```

### LIKE/SKIP スタンプ

動画エリア上に `motion.div` で絶対配置。ドラッグ量に応じて `opacity` が変化する。常時表示のヒントカードは廃止。

```tsx
// likeOpacity: x が 20→SWIPE_THRESHOLD の間で 0→1
const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
// skipOpacity: x が -SWIPE_THRESHOLD→-20 の間で 1→0
const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])
```

### サンプル画像ストリップ

動画がない作品や情報エリアの余白を埋めるため、`sampleImageURL` のサムネイルを横スクロールで表示。

```tsx
<div className="-mx-4 flex gap-1 overflow-x-auto px-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  {imgs.slice(0, 8).map((url, i) => (
    <img key={i} src={url} alt="" className="h-14 w-auto flex-none rounded object-cover" loading="lazy" />
  ))}
</div>
```

### iOS Safari overflow:hidden バグ対策

CSS transform を持つ要素の `overflow: hidden` が子要素をクリップしないバグを回避するため、クリップ用の外側 `div` とトランスフォーム用の `motion.div` を分離。

```tsx
// 外側: overflow-hidden + z-index（transform なし）
<div className="absolute inset-x-4 overflow-hidden rounded-2xl" style={{ zIndex, top, bottom, maxHeight }}>
  // 内側: transform のみ（overflow-hidden なし）
  <motion.div className="absolute inset-0 flex flex-col" style={{ x, y, rotate, scale }}>
```

### ゲストユーザー対応

- スワイプ履歴: LocalStorage（`addGuestSwipe`）
- お気に入り: LocalStorage（`addGuestFavorite`）
- 10枚スワイプ後に `LoginPromptSheet` を表示

---

## Playwright テスト構成

| ファイル | 内容 |
|---------|------|
| `tests/discover.spec.ts` | 7テスト: 表示・カードレイアウト・スワイプ動作・CTA・ナビ |
| `tests/device-check.spec.ts` | デバイス別スクリーンショット確認 |

対象デバイス: iPhone SE (375×667) / iPhone 15 (393×852) / iPhone 15 Plus (430×932) / Pixel 7 (412×915) / Desktop (1440×900) / iPad (768×1024)

---

## Service Worker / Middleware

### proxy.ts matcher

`sw.js` / `manifest.webmanifest` / `icons/` が年齢確認リダイレクトの対象外になるよう matcher を設定。

```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|icons/|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### lib/supabase/middleware.ts の isPublicAsset

```ts
const isPublicAsset =
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon') ||
  pathname.startsWith('/api/') ||
  pathname.startsWith('/icons/') ||
  pathname === '/manifest.webmanifest' ||
  pathname === '/sw.js'
```

### sw.js の clone 修正

Response body を使用する前に `clone()` しなければならない（使用後のcloneはエラー）。

```js
.then((response) => {
  if (response.ok) {
    const toCache = response.clone()  // 先にclone
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache))
  }
  return response  // cloneではなくオリジナルを返す
})
```

### Next.js 16 の middleware 規約

Next.js 16 では `middleware.ts` が deprecated。`proxy.ts`（プロジェクトルート）を使用する。両方存在するとエラーになるため `middleware.ts` は削除。

---

## TODO

### ページ・コンポーネント
- [x] `app/discover/page.tsx` 作成
- [x] `app/discover/SwipeFeedClient.tsx` 作成（`next/dynamic` + `ssr: false`）
- [x] `components/swipe/SwipeFeed.tsx` 作成
  - [x] 初期20件取得、末尾で追加20件フェッチ
  - [x] 右スワイプ = LIKE・お気に入り追加
  - [x] 左スワイプ = SKIP
  - [x] `motion` でカードの傾き・スタンプアニメーション
  - [x] `navigator.vibrate(10)` で振動フィードバック（Android）
  - [x] カード型レイアウト（safe-area 対応・左右マージン・角丸）
  - [x] FANZAで見るCTAをカード内 mt-auto で下部固定
  - [x] デスクトップ含む全デバイスで `max-w-[480px]` モバイル見た目に統一
  - [x] `maxHeight: 680` で大画面での情報エリア過大を防止
  - [x] サンプル画像ストリップ（横スクロールサムネイル）追加

### 動画プレイヤー
- [x] `components/swipe/SampleVideoPlayer.tsx` 作成
  - [x] `window.innerWidth` ベースで `sampleMovieURL` サイズ選択
  - [x] litevideo URL → cc3001 直接MP4 URL 変換
  - [x] `<video autoPlay muted playsInline controls>` で自動再生 + コントロール表示
  - [x] URL の `size=W_H` からアスペクト比を動的取得（`parseUrlSize`）
  - [x] MP4 取得失敗時は litevideo iframe にフォールバック
  - [x] 動画なし作品は `sampleImageURL` スライドショー or 静止画

### スワイプ履歴の保存
- [x] `actions/swipe.ts` 作成
  - [x] `recordSwipe(itemId, direction)`: ログイン済みは Supabase、ゲストは LocalStorage
  - [x] ゲストが10枚スワイプしたらログイン促進シートを表示

### PWA / インフラ
- [x] `proxy.ts` matcher に sw.js・manifest・icons を除外追加
- [x] `lib/supabase/middleware.ts` の isPublicAsset に同様の除外追加
- [x] `public/sw.js` の Response clone バグ修正
- [x] Next.js 16 用に `middleware.ts` を削除し `proxy.ts` に統一

### パーソナライズとの連携
- [x] スワイプ履歴をジャンル・女優スコアに変換する関数を `lib/personalization.ts` に追加（011 で利用）
