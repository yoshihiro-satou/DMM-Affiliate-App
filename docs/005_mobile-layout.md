# 005 モバイルレイアウト・ボトムナビ

## 概要
サイト全体のモバイルファーストレイアウトを構築する。ボトムナビ・セーフエリア・dvh・スケルトンUIを標準化する。

## 依存
- 004 認証（マイページタブのログイン状態表示）

## TODO

### ルートレイアウト
- [ ] `app/layout.tsx` に年齢確認 Cookie チェック用インラインスクリプトを追加（ちらつき防止）
- [ ] `next/font` でフォント設定（layout shift 防止）
- [ ] `<meta name="viewport">` に `viewport-fit=cover` を追加（セーフエリア対応）

### ボトムナビゲーション
- [ ] `components/layout/BottomNav.tsx` 作成（Client Component）
  - [ ] タブ5つ: ホーム / 探す / お気に入り / 検索 / マイページ
  - [ ] `padding-bottom: env(safe-area-inset-bottom)` 適用
  - [ ] 各タブ最小44×44px
  - [ ] アクティブタブをアイコン＋色変化で視覚的に強調
  - [ ] `usePathname()` でアクティブタブを判定
- [ ] ボトムナビ分のスペース確保: メインコンテンツに `pb-[calc(4rem+env(safe-area-inset-bottom))]`

### 共通コンポーネント
- [ ] `components/ui/Skeleton.tsx` - 汎用スケルトン（幅・高さを props で受け取る）
- [ ] `components/ui/ProductCardSkeleton.tsx` - 商品カード用スケルトン
- [ ] 全ページに `loading.tsx` を配置（ルートレベルのフォールバック）

### グローバルスタイル
- [ ] `app/globals.css` に `min-height: 100dvh` を適用
- [ ] スクロールバー非表示（スワイプフィード用）: `.no-scrollbar` ユーティリティクラス追加
- [ ] タップハイライト除去: `-webkit-tap-highlight-color: transparent`

### PWA manifest（下準備）
- [ ] `app/manifest.ts` 作成（name / short_name / theme_color / background_color / icons）
