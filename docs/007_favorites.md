# 007 お気に入り機能

## 概要
ゲストは LocalStorage で5件まで保存。ログイン後は Supabase で無制限に保存。オプティミスティックUIで即時反映。

## 依存
- 001 Supabase 初期設定
- 004 認証

## TODO

### Server Actions
- [x] `actions/favorites.ts` 作成
  - [x] `addFavorite(item)`: Supabase favorites テーブルに UPSERT → `revalidatePath('/favorites')`
  - [x] `removeFavorite(itemId)`: DELETE → `revalidatePath('/favorites')`
  - [x] 認証チェック: `getClaims()` で userId を取得、未ログインは早期リターン

### ゲスト用 LocalStorage 管理
- [x] `lib/guest-favorites.ts` 作成
  - [x] `getGuestFavoriteIds()`: LocalStorage から ID 配列を取得
  - [x] `getGuestFavorites()`: LocalStorage から GuestFavItem[] を取得（表示用）
  - [x] `addGuestFavorite(item)`: 5件超えたら `{ limitReached: true }` を返す
  - [x] `removeGuestFavorite(itemId)`: IDs と data の両キーから削除
  - [x] `isGuestFavorited(itemId)`: IDリストに含まれているか確認

### お気に入りボタン
- [x] `components/product/FavoriteButton.tsx` 作成（Client Component）
  - [x] `useState` でオプティミスティック反映、失敗時ロールバック
  - [x] `useAuth()` コンテキストでログイン状態取得 → Server Action / LocalStorage を切り替え
  - [x] ハート ❤️ アイコン（44×44px タップ領域確保）
  - [x] 6件目追加時にログイン促進ボトムシートを表示
- [x] `components/product/ProductCard.tsx` に `overlaySlot` prop 追加
- [x] `app/sale/page.tsx` / `app/ranking/page.tsx` に FavoriteButton 統合

### Auth コンテキスト
- [x] `components/providers/auth-provider.tsx` 作成（AuthProvider + useAuth hook）
- [x] `app/layout.tsx` を async 化し、AuthProvider でラップ
- [x] AuthProvider に `isLoggedIn` / `userId` を渡す

### お気に入り一覧ページ
- [x] `app/favorites/page.tsx` 作成
  - [x] ログイン済み: Supabase から取得・グリッド表示（item_title / image_url / price / item_url）
  - [x] ゲスト: `GuestFavoritesList`（`useSyncExternalStore` で LocalStorage 読み取り）
  - [x] 空の場合: 「まだお気に入りがありません」＋セールページへのリンク
- [x] `app/favorites/RemoveFavoriteButton.tsx` - ログイン済みの削除ボタン（オプティミスティック）
- [x] `app/favorites/GuestFavoritesList.tsx` - ゲスト用クライアントコンポーネント
- [x] `app/favorites/loading.tsx` - スケルトンUI

### インラインスクリプト（ハイドレーション対策）
- [x] `app/layout.tsx` にインラインスクリプト追加（`guest_favorites` 件数を `#fav-badge` に反映）
- [x] `components/layout/BottomNav.tsx` の Heart タブに `id="fav-badge"` span を追加（suppressHydrationWarning）

### ゲスト→ログイン移行
- [x] `lib/guest-migration.ts` 更新: `guest_favorites_data` もクリーンアップ
- [x] `app/login/actions.ts` の `migrateGuestData` 更新: `favoritesMeta` を受け取り item_title / item_url / image_url / price を Supabase に保存

## 追加（2026-06）: 画像・値下げ可視化・並び替え

### 画像の高精細化・横長表示
- [x] `lib/dmm/image.ts` の `toLargeDmmImageUrl()` で DMM サムネ（`...pt.jpg` / `...ps.jpg`）を大サイズ（`...pl.jpg`・800x538）へ正規化。`lib/dmm/mappers.ts` の保存時と、お気に入り表示時の両方で適用
- [x] `pl.jpg` は横長ジャケット（表+裏）のため、カードを横長比率 `aspect-[800/538]` に変更。グリッドはモバイル1列（`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`）
- [x] 検索結果（`lib/search.ts`）も大サイズ優先＋正規化（検索からの保存・検索グリッド表示も改善）

### 値下げ可視化
- [x] `favorites.list_price` 列を追加。保存時に定価も記録（`FavoriteItem` / `addFavorite` / `dmmItemToFavorite` / `SearchFavoriteButton`）
- [x] `get_latest_price_details(item_ids)` RPC で `price_history` の最新価格を取得し、保存時 `price` と比較
- [x] `app/favorites/page.tsx`（サーバー）で `EnrichedFavorite`（`app/favorites/types.ts`）を組み立て：保存後の値下げ額・現在割引率を算出
- [x] 保存後に値下げ → 「値下げ」バッジ＋元価格取り消し線＋ `-N%`。現在セール中 → 「N%OFF」バッジ。ヘッダーに「値下げ中 N件」
- [x] ゲストは上限5件・現在価格を持たないため、保存時 `list_price` から「N%OFF」セールバッジのみ（`GuestFavoritesList`）
- 価格は価格監視 Worker（毎時・`get_top_favorited_items` 上位100件）が `price_history` に記録。データが無い間はバッジ非表示でグレースフル。表示価格は必ず実データ連動（景表法）

### 並び替え・絞り込み
- [x] `app/favorites/FavoritesBrowser.tsx`（クライアント）：並び替え（追加順/値下げ順/割引率順/価格安順）＋フィルタ（すべて/値下げ中/セール中）をメモリ内で処理

## 備考
- ISR ページ（セール・ランキング）では `initialFavorited=false` で開始。ゲストはタップ後に localStorage と同期。ログイン済みはタップで正しく追加/削除される
- `useSyncExternalStore` の `getServerSnapshot: () => '[]'` によりサーバーレンダリング時は空配列を返し、クライアント側で再レンダリングされる
