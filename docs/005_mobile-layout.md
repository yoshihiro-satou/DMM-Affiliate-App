# 005 モバイルレイアウト・ボトムナビ

## 概要
サイト全体のモバイルファーストレイアウトを構築する。ボトムナビ・セーフエリア・dvh・スケルトンUIを標準化する。

## 依存
- 004 認証（マイページタブのログイン状態表示）

## TODO

### ルートレイアウト
- [x] `app/layout.tsx` 更新（`class="dark"` + 紫グラデーション背景（`backgroundAttachment: fixed`）、`lang="ja"`）
  - **背景色**: `bg-[#080808]` は body から削除済み。全ページの `<main>` も透過（背景なし）とし、body の紫グラデーションが余白に透けて見える
  - 紫グラデーション: `linear-gradient(135deg, #3b1060 → #7b2fbe → #3b1060)` を body に `backgroundAttachment: fixed` で適用
- [x] `next/font` でフォント設定（**M PLUS Rounded 1c**（丸ゴシック）+ Geist Mono、layout shift 防止）
  - `weight: ['400', '500', '700']`、`preload: false`（日本語フォントの巨大プリロード回避）
  - CSS変数 `--font-sans` に直接マップ、Tailwind `font-sans` で全体適用
- [x] `viewport-fit=cover` を `export const viewport: Viewport` で設定（App Router 方式）
- [x] `proxy.ts`（プロジェクトルート）でミドルウェア処理（Next.js の新規約）
  - `middleware.ts` は deprecated → `proxy.ts` + `export async function proxy()` に移行済み

### ボトムナビゲーション
- [x] `components/layout/BottomNav.tsx` 作成（Client Component）
  - [x] タブ5つ: ホーム / 探す / お気に入り / 検索 / マイページ
  - [x] `padding-bottom: env(safe-area-inset-bottom)` 適用
  - [x] 各タブ最小44×44px
  - [x] アクティブタブをアイコン＋赤ライン＋白色で視覚的に強調
  - [x] `usePathname()` でアクティブタブを判定
  - [x] `/age-check` `/login` `/auth` では非表示（認証ページはフルスクリーン）
- [x] ボトムナビ分のスペース確保: 各ページで `pb-[calc(4rem+env(safe-area-inset-bottom))]` を適用

### ナビゲーションプログレスバー
- [x] `components/layout/NavigationProgress.tsx` 作成（Client Component）
  - ページ遷移時に画面上部に赤い2pxプログレスバーを表示
  - `usePathname()` + `useSearchParams()` でパス変化を検知して完了アニメーション
  - クリックイベントで同一オリジンのリンク検知、即座にバーを開始
  - `app/layout.tsx` で `<Suspense>` でラップして配置（`useSearchParams()` のSuspense境界必須）
- [x] `components/ui/PageSpinner.tsx` 作成
  - フルスクリーン中央にスピナー表示（ローディング時のフォールバック）
  - 背景色なし（body の紫グラデーションが透ける）
- [x] `app/loading.tsx` を `<PageSpinner />` に変更（ルートレベルフォールバック）

### FANZAクレジット表示（規約必須）
- [x] `components/layout/DmmCredit.tsx` 作成
  - FANZA API 利用規約で定められた画像クレジット（88×35 gif）を右端に表示
  - `<img>` タグを直接使用（`next/image` 使用不可・規約で改変禁止のため、`eslint-disable-next-line` コメント付き）
  - リンク先: `https://affiliate.dmm.com/api/`
  - `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` でボトムナビと重ならないよう設定
  - `app/layout.tsx` の `{children}` 直後・`<BottomNav />` 直前に配置（全ページ共通表示）
  - 背景なし（body の紫グラデーションが透ける）

### 共通コンポーネント
- [x] `components/ui/Skeleton.tsx` - 汎用スケルトン（className で幅・高さを指定）
- [x] `components/ui/ProductCardSkeleton.tsx` - グリッドカード用スケルトン
  - `aspect-video`（16:9）+ `featured` prop 対応（`col-span-2 row-span-2` で大カード表示）

### グローバルスタイル
- [x] `app/globals.css` に `html { min-height: 100dvh }` を適用
- [x] `.no-scrollbar` ユーティリティクラス追加（`@layer utilities`）
- [x] `-webkit-tap-highlight-color: transparent` をグローバルに適用
- [x] `.dark` の `--background` を `#080808` に設定（個別セクションの背景色は各コンポーネントで設定）
- [x] スティッキーヘッダー（検索ページ等）の背景: `bg-[#2d0a4e]/90` に統一（紫系）

### PWA manifest（下準備）
- [x] `app/manifest.ts` 作成（name / short_name / theme_color / background_color / icons パス定義）
