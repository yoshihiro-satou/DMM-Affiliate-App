# 019 GA4 アナリティクス設定ガイド

> 作成日: 2026-05-28（第4セッション）

---

## 概要

Google Analytics 4 の ToDoリスト（11件中8件残り）を中心に、コード実装と管理画面設定を実施。  
完了・スキップ済みのタスクを整理し、残り作業の方針を確定した。

---

## 完了した作業

### コード実装（デプロイ: `a8739eaa`）

#### 1. GA4 User-ID 設定

ログインユーザーの Supabase UID を GA4 に渡してクロスデバイス計測を実現。

**変更ファイル:**

| ファイル | 内容 |
|---------|------|
| `lib/analytics.ts`（新規） | GA_ID・`setGaUserId()`・`trackEvent()` を一元管理 |
| `app/layout.tsx` | 初回ロード時に `user_id: user.sub` を GA4 config に渡す |
| `components/auth-listener.tsx` | `SIGNED_IN` / `SIGNED_OUT` イベントで GA4 User-ID を同期 |

```ts
// lib/analytics.ts
export const GA_ID = 'G-X8VN2V321X'

export function setGaUserId(userId: string | null) { ... }
export function trackEvent(name: string, params?: Record<string, unknown>) { ... }
```

**動作フロー:**
```
ページ初回ロード（ログイン済み）
  → Server側でSupabase UIDを取得
  → GA4 init scriptに user_id: 'uuid...' を含めて送信

ログイン操作 → auth-listener: SIGNED_IN → setGaUserId(session.user.id)
ログアウト操作 → auth-listener: SIGNED_OUT → setGaUserId(null)
```

#### 2. GA4 カスタムイベント実装

| イベント名 | ファイル | 発火タイミング | パラメータ |
|-----------|---------|-------------|-----------|
| `add_to_wishlist` | `FavoriteButton.tsx` | お気に入り追加 | `items[].item_id`, `items[].item_name` |
| `remove_from_wishlist` | `FavoriteButton.tsx` | お気に入り解除 | `items[].item_id`, `items[].item_name` |
| `swipe` | `SwipeFeed.tsx` | スワイプ操作 | `direction`, `item_id`, `item_name` |
| `search` | `SearchInput.tsx` | 検索ワード確定（300ms後） | `search_term` |

商品クリック（アフィリエイトリンク）は GA4 **Enhanced Measurement の外部リンク追跡**で対応（コード変更不要）。

---

### GA4 管理画面での設定

| 設定 | 状態 | 備考 |
|------|------|------|
| Search Console リンク | ✅ 完了 | `管理 → プロダクトリンク → Search Console のリンク` |
| Google シグナル有効化 | ✅ 完了 | `管理 → データ収集と変更 → データ収集` |
| カスタムインサイト（3件）| ✅ 完了 | 下記参照 |
| User-ID レポート有効化 | ✅ 完了 | データ受信はログインユーザー来訪後に自動で反映 |

#### 作成したカスタムインサイト

| インサイト名 | 検知内容 |
|------------|---------|
| 1日のユーザー数の異常値 | サイト障害・API停止・流入激減を検知 |
| 1日のイベント数の異常値 | カスタムイベントの異常を検知 |
| 1日のキーイベント数の異常値 | お気に入り追加などの重要行動の変化を検知 |

アラートメールは `yoshihirock0710@gmail.com` に届く。データが溜まると24〜48時間後に検知が開始される。

---

### スキップしたタスク

| タスク | 理由 |
|--------|------|
| Google 広告にリンクする | アダルトコンテンツのため Google Ads 使用不可 |
| 広告を最適化する | 同上 |
| ユーザー提供データを設定する | Google ポリシーの「デリケートなカテゴリ」に該当するためリスクあり |
| Measurement Protocol を設定する | 複雑・このサイト規模では費用対効果が低い |

---

### DMM API 400 Bad Request 再発と対処

デプロイ後に API が再び 400 エラーになった。wrangler tail で原因を特定。

**原因:** Cloudflare シークレット `DMM_API_ID` の値が誤っていた

**診断コマンド（デプロイ後に必ず確認）:**
```bash
curl -s -b "age_check_done=1" "https://fanzapicks.com/api/dmm/items?hits=1&sort=rank&service=digital&floor=videoa"
# → {"items":[...]} ならOK / {"error":"DMM API fetch failed"} ならAPIキー問題
```

**修正手順:**
1. https://affiliate.dmm.com/api/ で「WebサービスID」を確認
2. `npx wrangler secret put DMM_API_ID` で正しい値を入力
3. curl で再確認

---

## 残り作業（イベントデータ反映後）

データが溜まった後（24〜48時間後）に対応する。

### オーディエンス作成（`始める` カテゴリ）

| オーディエンス名 | 条件 | 有効期間 |
|---------------|------|---------|
| お気に入り追加ユーザー | イベント: `add_to_wishlist` | 30日 |
| 検索実行ユーザー | イベント: `search` | 7日 |
| スワイプ5回以上 | イベント: `swipe` × 5回以上 | 14日 |

### コンバージョン（キーイベント）設定

`管理 → イベント` で `add_to_wishlist` を見つけ → 「コンバージョンとしてマーク」

### Enhanced Measurement 設定

`管理 → データストリーム → [ストリーム] → Enhanced Measurement` → 「外部クリック」をオン

---

## GA4 ToDoリスト 最終状態

| カテゴリ | 残件数 | 状況 |
|---------|--------|------|
| 始める | 1件 | オーディエンス作成（イベント反映待ち） |
| アカウントをリンクする | 0件 | Search Console ✅・Google広告スキップ |
| レポートを強化する | 1件 | オーディエンス作成（イベント反映待ち） |
| 広告を最適化する | スキップ | アダルトコンテンツ不可 |
| ファーストパーティデータ | 0件 | User-ID ✅・残り2件スキップ |

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/018_next-session-guide.md` | 全体の引き継ぎガイド（最終デプロイ情報など） |
| `lib/analytics.ts` | GA4 ヘルパー関数 |
