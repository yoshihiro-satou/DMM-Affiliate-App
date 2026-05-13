# 005 モバイルレイアウト・ボトムナビ

## 概要
サイト全体のモバイルファーストレイアウトを構築する。ボトムナビ・セーフエリア・dvh・スケルトンUIを標準化する。

## 依存
- 004 認証（マイページタブのログイン状態表示）

## TODO

### ルートレイアウト
- [x] `app/layout.tsx` 更新（`class="dark"` + `bg-[#080808]`、`lang="ja"`）
- [x] `next/font` でフォント設定（Geist Sans / Mono、layout shift 防止）
- [x] `viewport-fit=cover` を `export const viewport: Viewport` で設定（App Router 方式）

### ボトムナビゲーション
- [x] `components/layout/BottomNav.tsx` 作成（Client Component）
  - [x] タブ5つ: ホーム / 探す / お気に入り / 検索 / マイページ
  - [x] `padding-bottom: env(safe-area-inset-bottom)` 適用
  - [x] 各タブ最小44×44px
  - [x] アクティブタブをアイコン＋赤ライン＋白色で視覚的に強調
  - [x] `usePathname()` でアクティブタブを判定
  - [x] `/age-check` `/login` `/auth` では非表示（認証ページはフルスクリーン）
- [x] ボトムナビ分のスペース確保: 各ページで `pb-[calc(4rem+env(safe-area-inset-bottom))]` を適用

### 共通コンポーネント
- [x] `components/ui/Skeleton.tsx` - 汎用スケルトン（className で幅・高さを指定）
- [x] `components/ui/ProductCardSkeleton.tsx` - 商品カード用スケルトン（2/3アスペクト比）
- [x] `app/loading.tsx` 作成（ルートレベルのフォールバック、6枚グリッド）

### グローバルスタイル
- [x] `app/globals.css` に `html { min-height: 100dvh }` を適用
- [x] `.no-scrollbar` ユーティリティクラス追加（`@layer utilities`）
- [x] `-webkit-tap-highlight-color: transparent` をグローバルに適用
- [x] `.dark` の `--background` を `#080808` に設定

### PWA manifest（下準備）
- [x] `app/manifest.ts` 作成（name / short_name / theme_color / background_color / icons パス定義）
