# 007 お気に入り機能

## 概要
ゲストは LocalStorage で5件まで保存。ログイン後は Supabase で無制限に保存。オプティミスティックUIで即時反映。

## 依存
- 001 Supabase 初期設定
- 004 認証

## TODO

### Server Actions
- [ ] `actions/favorites.ts` 作成
  - [ ] `addFavorite(item)`: Supabase favorites テーブルに INSERT → `revalidatePath('/favorites')`
  - [ ] `removeFavorite(itemId)`: DELETE → `revalidatePath('/favorites')`
  - [ ] 認証チェック: 未ログインは LocalStorage 操作にフォールバック

### ゲスト用 LocalStorage 管理
- [ ] `lib/guest-favorites.ts` 作成
  - [ ] `getGuestFavorites()`: LocalStorage から取得（最大5件）
  - [ ] `addGuestFavorite(item)`: 5件超えたら登録促進トーストを表示
  - [ ] `removeGuestFavorite(itemId)`: 削除

### お気に入りボタン
- [ ] `components/product/FavoriteButton.tsx` 作成（Client Component）
  - [ ] オプティミスティックUI: `useOptimistic` でタップ即時反映、失敗時ロールバック
  - [ ] ログイン状態によって Server Action / LocalStorage を切り替え
  - [ ] ハート ❤️ アイコン（44×44px 以上のタップ領域確保）
  - [ ] 6件目追加時にログイン促進ボトムシートを表示

### お気に入り一覧ページ
- [ ] `app/favorites/page.tsx` 作成
  - [ ] ログイン済み: Supabase から取得・グリッド表示
  - [ ] ゲスト: LocalStorage から取得・「ログインで同期」バナー表示
  - [ ] 空の場合: 「まだお気に入りがありません」＋おすすめ作品へのリンク
- [ ] `app/favorites/loading.tsx` - スケルトンUI

### インラインスクリプト（ハイドレーション対策）
- [ ] ボトムナビのお気に入りタブバッジをインラインスクリプトで先に設定（ゲスト件数表示のちらつき防止）
