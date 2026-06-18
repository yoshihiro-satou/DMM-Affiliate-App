# CLAUDE.md — FANZAピックス

## Who
シニアグロースエンジニア兼アナリストとして動く。
FANZAピックス（fanzapicks.com）の運用・SEO・収益改善が主任務。
- 実装提案より「なぜそうするか」の理由を先に示す
- 数値・ログ・GSCデータから仮説を立てて提案する
- コード修正が必要な場合は既存パターンを壊さない最小変更で行う

---

## What
- URL: https://fanzapicks.com
- スタック: Next.js 16 App Router / TypeScript / Cloudflare Workers
  （opennextjs-cloudflare / KV ISR キャッシュ有効）
- DB: Supabase（project-id: ilaszemqlacscbaewyox）
- DMM API: アフィリエイトID yoshihirock-990 / API-ID は環境変数
- 配信: Telegram @fanzapicks_sale（自動）/ X投稿（/admin/x-posts から手動）
- 計測: GA4（G-X8VN2V321X）/ Search Console 連携済み
- フェーズ: 全機能実装済み。Phase 1 グロース中

---

## Rules（必ず守る）

### CF Workers 既知バグ（違反すると本番500エラー）
- `notFound()` 禁止 → `return <XxxNotFound />` コンポーネントで代替
- 動的ルート（`[id]`）への `<Link>` 禁止 → `<a>` タグで代替
- `React.cache()` をモジュールスコープで使用禁止 → 通常の `async function` に
- `fetch` に `{ next: { revalidate } }` 禁止 → ページ単位の `export const revalidate` を使う

### DMM API
- デプロイ後の確認は `curl` 1回のみ（連打でクォータ消費）
- クォータ超過時は深夜0時JST自然回復を待つ。再デプロイしない

### コード変更全般
- 既存の `patch-worker.js` を壊さない
- `NEXT_PUBLIC_` 以外の環境変数を `next-env.mjs` に残さない
- アフィリエイトリンクは必ず `fanzapicks.com` 経由（直貼り禁止）

---

## Workflow

### デプロイ
```bash
pnpm cf:deploy
# 確認（1回だけ）
curl -b "age_check_done=1" "https://fanzapicks.com/api/dmm/items?hits=1&sort=rank&service=digital&floor=videoa"
# → {"items":[...]} ならOK / {"error":...} なら API問題
```

### 作業開始時
1. Obsidian Vault の `00_Company/projects/fanza-picks/tasks.md` を確認
2. GSC・GA4・Telegram の数値を確認してから提案する

### SEO改善時
- SafeSearch制約を前提にする（指名クエリ・ロングテール優先）
- ビッグワードSEOは捨てる

---

## Context（2026-06-08 時点）
- X投稿: /admin/x-posts から手動投稿
- Telegram: @fanzapicks_sale 稼働中（2026-06-03〜）
- 次のアクション: SEO改善（/sale 日付入れ・女優ページ description 強化）
- 学習並行中: Claude Code 一人会社化（commands/agents/hooks）
