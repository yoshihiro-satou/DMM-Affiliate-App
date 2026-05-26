# 018 次回セッション引き継ぎガイド

> 作成日: 2026-05-26 / 最終デプロイ: `dbdd712`

---

## 現在のサイト状態（ひと目でわかる）

| 項目 | 状態 |
|------|------|
| 本番 URL | **https://fanzapicks.com** （カスタムドメイン稼働中） |
| テスト URL | https://dmm-affiliate-app.yoshihirock0710.workers.dev |
| ホスティング | Cloudflare Workers（opennextjs-cloudflare） |
| cookies() | ✅ 修正済み（Patch 6e/6f） |
| DMM API | ⏳ **審査待ち**（申請済 2026-05-26、3営業日目安） |
| ページ表示 | API 待機中は「コンテンツを準備中」を表示（正常） |
| Supabase | ✅ 接続正常 |
| PWA | ✅ Service Worker 稼働 |

---

## DMM 審査完了後に最初にやること

### 1. API 動作確認（1分）

```bash
curl "https://api.dmm.com/affiliate/v3/ItemList?api_id=uaVT3DGhgNk5XmNLZ9PG&affiliate_id=yoshihirock-990&output=json&site=FANZA&hits=1"
```

`"status":200` が返れば承認完了。

### 2. サイト表示確認

```bash
curl -s -b "age_check_done=1" "https://fanzapicks.com/ranking" | grep -c "コンテンツを準備"
# 0 なら正常表示に戻っている
```

リデプロイは不要（コードに変更がなければ次のビルド時に ISR キャッシュが自然に更新される）。

---

## 積み残しタスク（優先順）

### 🔴 最優先

#### サイト名を「おしランク」→「FANZAピックス」に統一

現在コード内に「おしランク」が残っている。DMM に申請したサイト名と一致させる必要がある。

変更対象ファイル：

| ファイル | 変更箇所 |
|---------|---------|
| `app/layout.tsx` | `title.default` / `title.template` / `applicationName`（3箇所） |
| `app/manifest.ts` | `name` / `short_name`（2箇所） |
| `app/page.tsx` | `metadata.title` / OG title / ヘッダー表示テキスト「おしランク」「OSHI RANK」（4箇所） |

変更後の値：
```
サイト名:  FANZAピックス
短縮名:    FANZAピックス
template:  %s | FANZAピックス
```

---

### 🟡 重要（SEO・法務）

#### Google Search Console 登録

1. [search.google.com/search-console](https://search.google.com/search-console) を開く
2. 「URLプレフィックス」で `https://fanzapicks.com` を追加
3. 所有権確認：`<meta name="google-site-verification">` タグを `app/layout.tsx` の `metadata` に追加
   ```ts
   verification: { google: 'xxxxxxxxxxxxxxxx' }
   ```
4. サイトマップ送信：`https://fanzapicks.com/sitemap.xml`

#### Google Analytics 4 導入

`app/layout.tsx` に GA4 の gtag スクリプトを追加するか、`next/script` で非同期ロード。
測定 ID（G-XXXXXXXXXX）を取得してから実施。

#### Bing Webmaster Tools 登録

[bing.com/webmasters](https://www.bing.com/webmasters) — Google SC とデータ共有可能。

---

### 🟢 推奨（サイト品質向上）

#### OGP 画像の追加

現在 `next/og` は Cloudflare Workers 環境で動作不可のため削除済み。
代替案：
- Cloudflare Images や外部サービスで静的 OGP 画像を生成して `public/og/` に配置
- `app/layout.tsx` の `openGraph.images` に固定 URL を設定

```ts
openGraph: {
  images: [{ url: '/og/default.jpg', width: 1200, height: 630 }],
}
```

#### `robots.txt` の確認

現在の設定（`app/robots.ts`）で `/api/` は Disallow 済み。問題なし。

#### 構造化データの確認

ランキングページ・女優ページに JSON-LD が実装済み。
Google リッチリザルトテストで確認推奨：
`https://search.google.com/test/rich-results?url=https://fanzapicks.com/ranking`

---

## SEO で別途取り組むべき施策

### コンテンツ SEO

| 施策 | 優先 | 概要 |
|------|------|------|
| タイトルタグの最適化 | 高 | 各ページ `metadata.title` に検索キーワードを含める |
| 内部リンク強化 | 中 | ランキング→個別商品→関連女優のリンク網を増やす |
| 女優ページの充実 | 高 | 女優ごとにユニークな説明文・h1 を設定（現在は名前のみ） |
| ロングテール記事 | 低 | 「○○ジャンル おすすめ」などのカテゴリ集計ページ |

### テクニカル SEO

| 施策 | 優先 | 概要 |
|------|------|------|
| Core Web Vitals 計測 | 高 | PageSpeed Insights で fanzapicks.com を計測 |
| 画像 alt 属性 | 中 | `GridCard` / `ProductCard` の `<Image>` に適切な alt を付ける |
| canonical URL | 済 | 各ページ設定済み |
| ISR キャッシュ確認 | 中 | Cloudflare KV を有効化するとページキャッシュが安定する（現在未使用） |
| hreflang | 低 | 日本語専用サイトのため不要 |

### 外部施策

| 施策 | 優先 | 概要 |
|------|------|------|
| X（旧 Twitter）連携 | 高 | 自動投稿スクリプト（X_API_KEY 設定済み）の定期実行設定 |
| アフィリエイト ASP 追加 | 中 | A8.net / Amazonアソシエイト を補助として追加 |
| 被リンク獲得 | 低 | アダルトアフィリエイト系ブログへの掲載依頼 |

---

## 法務チェックリスト（随時確認）

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
# cookies() 動作確認
curl https://fanzapicks.com/api/test-cookies
# → {"ok":true,"count":0}

# DMM API 経由確認
curl -b "age_check_done=1" https://fanzapicks.com/ranking | grep "コンテンツを準備\|件以上"
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
