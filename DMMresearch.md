# DMMアフィリエイトAPI活用サイト設計まとめ

## DMM API v3 仕様

- **ベースURL**: `https://api.dmm.com/affiliate/v3/`
- **エンドポイント7種**: ItemList / FloorList / ActressSearch / GenreSearch / MakerSearch / SeriesSearch / AuthorSearch
- **認証**: `api_id` + `affiliate_id` をクエリに付けるだけ（署名不要、GET、JSON/XML対応）
- **ブラウザからのCORS不可** → Server Components か Route Handler でサーバープロキシ必須（API_IDを`NEXT_PUBLIC_`に絶対に付けない）
- **制限**: hits上限100件、offset上限50000、有効アフィID末尾は`-990`〜`-999`の10種のみ、レート制限値非公開（実運用は500ms〜1秒スリープ推奨）
- **主要レスポンスフィールド**: `title` / `affiliateURL` / `imageURL` (large/small/list) / `sampleImageURL` / `sampleMovieURL` (4サイズ) / `prices` / `review.average` + `review.count` / `iteminfo.actress` + `genre` + `maker` + `series`
- **FANZAリブランド**: 2018年8月以降 `DMM.R18` → `FANZA`。新規実装は`FANZA`を使う
- **next/image remotePatternsに登録必要な3ホスト**: `pics.dmm.co.jp` / `pics.dmm.com` / `awsimgsrc.dmm.co.jp`

---

## サイト形態と優先順位

ChatGPT案の優先順位: **セール特化 → お気に入り通知 → プレイリスト → 動的レコメンド → スワイプ探索**

### 形態A: セール・ランキング特化（立ち上げ最優先）

ベントーグリッドUI（Apple風大小タイル混在）でセール作品・週間ランキング・新人作品を配置。  
- 商品カード必須要素: 取消線定価 + 赤字割引 + %バッジ + 残時間カウントダウン + 星評価 → CVR 10〜30%改善  
- FANZA同人90%OFFクーポンは最強CV要素なので常時バナー固定  
- ランキング軸: 日次/週次/月次/ジャンル別/新人/検索急上昇の6軸  
- 独自スコア: `★平均 × log(レビュー件数) × 新しさ係数` で自動ランキング生成

### 形態B: お気に入り → 値下げ・セール通知

FANZA系はセール待ち・クーポン待ちユーザーが多く、「今買わない」離脱をリカバーできる。  
- UI: ❤️ お気に入り / 🔔 値下げ通知 / 🔥 90%OFF通知  
- 技術: Supabase + Push API + PWA + メール通知  
- 未来CV・リピートCVを取るためSEO依存を減らせる

### 形態C: パーソナライズドプレイリスト・診断

- **プレイリスト**: 「女優名/ジャンル/作品URL」入力 → ハイブリッド推薦（協調フィルタ + コンテンツ類似ベクトル）で自動生成。Spotify風テーマ別提案（朝活/寝落ち/シリーズ完走）
- **診断型**: 「今日はどんな気分？」3問 → おすすめ作品表示。発見体験型でTikTok型と相性良い
- LocalStorage + Supabase匿名ユーザーでcookielessパーソナライズ
- プレイリスト内全作品にアフィURL埋め込み、まとめ買いボタンで高単価CV

### 形態D: 女優・作品ハブ（中長期SEO資産）

ActressSearch + ItemList で女優ページを自動生成（バスト/ウエスト/ヒップ/身長でファセット検索）。  
- Vercel AI SDK の`streamUI`でAI自然言語検索（「○○な雰囲気の女優」）→ AI流入CVRは通常の42%高  
- 「女優名×ジャンル」ロングテール約5万種を自動生成でSEO流入の柱  
- shadcn/ui: タブ（デビュー作/最新作/シリーズ別/同事務所）+ 横スクロールカルーセル + サンプル動画ホバープレビュー

### 形態E: スワイプフィード（新規層獲得）

1画面1作品の縦スクロール。サンプル動画（size_476_306を3〜5秒ループ）を自動再生。  
- 右スワイプ=お気に入り / 左スワイプ=スキップ / 上スワイプ=詳細  
- スワイプUI採用でCV 3〜5倍の事例あり（Bijou Commerce）  
- LocalStorageにスワイプ履歴保存し協調+コンテンツフィルタで再ランキング  
- CTA: 画面下部「FANZAで見る」スティッキー固定（タップ44×44px以上）

### 形態F: 同人・電子書籍 シリーズ完走トラッカー

SeriesSearch + ItemListでシリーズ全作品を自動取得、既読/未読トラッキング + 新刊通知。  
- シリーズ完走ニーズが高い同人フロアに特化  
- 「全巻まとめ買いリンク」+ クーポン連動で高単価CV  
- 新刊監視: Route Handler + Cloudflare Workers cron で自動更新

---

## 推奨技術スタック

| 項目 | 採用技術 |
|------|---------|
| フレームワーク | Next.js App Router + Server Components |
| レンダリング | ISR (revalidate 60〜3600秒)。上位1000商品は`generateStaticParams`、残りは`dynamicParams=true`でオンデマンドISR |
| ホスティング（FANZA系） | **Cloudflare Pages** (next-on-pages / OpenNext) + Cloudflare KV + Cloudflare Images |
| ホスティング（一般作品のみ） | Vercel Pro + Supabase（東京リージョン） |
| ホスティング（VPS代替） | mixhost / カラフルボックス / ConoHa VPS + Apache + pm2 |
| DB | Supabase / VPS Postgres |
| 検索 | MeiliSearch（日本語タイポ補正、self-host or Cloud） |
| AI機能 | Vercel AI SDK（自然言語→APIクエリ変換、streamUI） |
| UI | shadcn/ui |

> **注意**: VercelとNetlifyは規約上FANZA系広告掲載が事実上不可。

---

## CVR・CTR改善施策

- **CTA文言**: 「クリック」→「無料サンプルを見る」など動詞+ベネフィット化 → CTR 25〜60%改善
- **CTA配置**: ファーストビュー / 本文中盤 / 記事末尾の3箇所 + スマホは下部スティッキー固定
- **回遊最適化（商品ページ下部）**: 似た作品 / 同シリーズ / 同女優 / 同タグ / 同価格帯 / 最近人気 を大量配置
- **まとめ買い導線**: 「このシリーズ一括」「同女優5本」など → 客単価向上 + 高料率
- **ソーシャルプルーフ**: 「24時間以内に○件購入」は**実データ連動必須**（虚偽表示は景表法違反）
- **軽量反応機能**: 👍/💤/🔥/😭の1タップリアクション → ソーシャルプルーフ + レコメンド精度 + 回遊率向上

---

## 法務・コンプライアンス

- **PR表記必須**: 景表法ステマ規制（2023年10月施行）により記事冒頭・リンク近辺に「PR」「広告」表記
- **年齢確認ゲート**: FANZAコンテンツは必須。`age_check_done=1` Cookie + `middleware.ts`で`/age-check`リダイレクト
- **画像・素材**: DMM公式提供素材のみ使用。改変（モザイク追加・スタンプ・黒塗り）禁止
- **自己アフィリエイト禁止**: DMM規約で明示的に禁止
- **禁止表現**: 「業界No.1」「絶対稼げる」など根拠なき優良/有利誤認表現
- **削除申請窓口**: 著作権者・肖像権者からの要請対応フォームを設置
- **最低支払額**: 5,000円

---

## 収益最大化のポイント

- FANZAの動画・電子書籍ダイレクト報酬は**最大70%**（キャンペーン時）
- 差別化の本命は**AI検索より「保存・通知・履歴・パーソナライズ」** → 競合のSEO記事量産と真逆のアプリ寄り設計
- 構造化データ（`Product` + `Offer` + `AggregateRating` + `VideoObject`）をJSON-LDで出力しリッチリザルト狙い
- FANZA管理画面の「おすすめ商品&検索ワード」「作品別報酬ランキング」を起点にSEO記事化
- SNS: X（Twitter）新作・セール速報の自動投稿 + OGP最適化が王道
