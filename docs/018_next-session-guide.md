# 018 次回セッション引き継ぎガイド

> 作成日: 2026-05-26 / 最終更新: 2026-05-27 / 最終デプロイ: `a4738b2`

---

## 現在のサイト状態（ひと目でわかる）

| 項目 | 状態 |
|------|------|
| 本番 URL | **https://fanzapicks.com** （カスタムドメイン稼働中） |
| テスト URL | https://dmm-affiliate-app.yoshihirock0710.workers.dev |
| ホスティング | Cloudflare Workers（opennextjs-cloudflare） |
| DMM API | ✅ **審査通過・正常動作**（2026-05-27確認） |
| サイト名 | ✅ 「おしランク」→「FANZAピックス」統一済み |
| Supabase | ✅ 接続正常 |
| PWA | ✅ Service Worker 稼働 |

---

## 2026-05-27 に完了した作業

| 作業 | コミット | 内容 |
|------|---------|------|
| サイト名統一 | `3fde484` | 「おしランク」→「FANZAピックス」全11箇所 |
| GSC 確認ファイル | `09044e2` | `public/googled2702fb0af647cea.html` + meta タグ |
| middleware 修正 | `002c770` | `sitemap.xml` / `robots.txt` / Google確認ファイルを age-check 除外 |
| GA4 導入 | `f7843f2` | `G-X8VN2V321X`（afterInteractive で非同期ロード） |
| OGP 画像 | `d9814d3` | `public/og/default.png`（1200×630 PNG、satori 生成） |
| age-check layout revert | `a4738b2` | ネスト制約で効果なし → 削除 |

### SEO・アナリティクス登録状況

| サービス | 状態 |
|---------|------|
| Google Search Console | ✅ 登録済み・所有権確認済み・サイトマップ送信済み |
| Google Analytics 4 | ✅ 稼働中（G-X8VN2V321X） |
| Bing Webmaster Tools | ✅ 登録済み（Google SC からインポート） |

---

## Core Web Vitals の現状と方針

PageSpeed Insights は Cookie を持たないため、常に `/age-check` ページを計測する。
サーバー側 age-gate がある限りこの制約は解消できない。

| 指標 | PSI（age-check） | 実態 |
|------|----------------|------|
| Performance | 80 | age-check ページの値（コンテンツページとは別） |
| SEO | 66 | "Page is blocked from indexing" = age-check の noindex が原因。正常な挙動 |
| LCP | 4.5秒 | age-check での重い日本語フォント読み込みが原因。根本解決にはルートレイアウト分割が必要 |
| Accessibility | 100 | ✅ |
| Best Practices | 100 | ✅ |

**実コンテンツページの確認方法：**
- Chrome で年齢確認を通過後、DevTools → Lighthouse で `/ranking` を計測
- GA4 → レポート → テクノロジー → ウェブの詳細（実ユーザーのCWVが数百人分溜まったら確認）

**LCP を根本改善する場合（優先度：低）：**
Route Group を使ってルートレイアウトを分割する必要がある。

```
app/
├── (main)/           ← フォント・GA4・BottomNav あり
│   ├── layout.tsx
│   ├── page.tsx
│   ├── ranking/
│   └── ...
├── age-check/        ← ルートレイアウトを持たせない
│   └── page.tsx
└── layout.tsx        ← html/body のみ（フォントなし）
```

---

## 積み残しタスク（優先順）

### 🟡 重要

#### X（Twitter）自動投稿の定期実行設定

`X_API_KEY` は設定済み。自動投稿スクリプトの定期実行（Cloudflare Cron）が未設定。

```bash
# 関連ファイル
workers/            # Cloudflare Workers cron ロジック
```

#### OGP 画像の更新・再生成

```bash
pnpm og:generate    # public/og/default.png を再生成
```

デザインを変えたい場合は `scripts/generate-og.mjs` を編集後に実行。

### 🟢 推奨

#### ISR キャッシュ（Cloudflare KV）の有効化

現在 KV は未使用。有効化するとランキング・商品ページのキャッシュが安定する。
`wrangler.toml` に KV バインディングを追加すれば利用可能。

#### 女優ページの充実

現在は女優名 + 商品一覧のみ。ユニークな説明文・h1 を追加するとロングテール SEO に効果。

#### コンテンツ SEO（ロングテール）

「○○ジャンル おすすめ」などのカテゴリ集計ページを追加するとオーガニック流入が増える見込み。

---

## 法務チェックリスト

| 項目 | 状態 | 備考 |
|------|------|------|
| PR 表記 | ✅ | 各ページに「PR ·」表示あり |
| FANZAクレジット | ✅ | `DmmCredit` コンポーネントが layout に実装済み |
| 年齢確認ゲート | ✅ | middleware で `/age-check` リダイレクト実装済み |
| 自己アフィリエイト禁止 | 要注意 | 自分のアカウントでの購入は規約違反 |
| ソーシャルプルーフ | ✅ | レビュー数は DMM API の実データを使用 |
| 画像改変禁止 | ✅ | DMM 提供画像をそのまま表示 |

---

## 環境変数の現在値（参照用）

`.env.local` に設定済み：
```
DMM_API_ID=uaVT3DGhgNk5XmNLZ9PG
DMM_AFFILIATE_ID=yoshihirock-990
NEXT_PUBLIC_SITE_URL=https://fanzapicks.com
NEXT_PUBLIC_SUPABASE_URL=https://ilaszemqlacscbaewyox.supabase.co
```

Cloudflare シークレット登録済み（`npx wrangler secret list` で確認）:
- `DMM_API_ID` / `DMM_AFFILIATE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY_JWK` / `VAPID_SUBJECT`
- `REVALIDATE_SECRET`

---

## デプロイ手順（毎回の確認用）

```bash
pnpm cf:deploy   # ビルド → パッチ → Cloudflare デプロイ（約3分）
```

デプロイ後の確認：
```bash
# DMM API 経由確認
curl -b "age_check_done=1" https://fanzapicks.com/ | grep -c "FANZAピックス"

# sitemap 確認
curl -s "https://fanzapicks.com/sitemap.xml" | head -5
```

パッチログで以下が出れば正常：
```
[Patch 6e] work-unit-async-storage-instance.js overwritten in project node_modules (2 file(s)) ✓
[Patch 6f] work-async-storage-instance.js overwritten in project node_modules (2 file(s)) ✓
```

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/017_cloudflare-windows-deploy.md` | Cloudflare Workers デプロイの全問題と解決策 |
| `docs/012_personalization.md` | パーソナライズ・レコメンド実装 |
| `docs/014_pwa-push.md` | PWA・Web Push 通知 |
| `CLAUDE.md` | プロジェクト全体の設計方針 |
