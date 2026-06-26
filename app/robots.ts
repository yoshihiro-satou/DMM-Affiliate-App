import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

// 私有・計測対象外のパス（全 UA 共通で除外）
const PRIVATE_PATHS = ['/mypage/', '/login/', '/register/', '/forgot-password/', '/api/']

// 学習系AIボット＝無断学習を防衛してブロック（[[meeting-log]] 第10回）。
// ※学習ボットのブロックは Google 通常検索の順位・インデックスには影響しない（公式）。
const TRAINING_BOTS = ['GPTBot', 'Google-Extended', 'ClaudeBot', 'anthropic-ai', 'CCBot']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      // 検索系AI（ChatGPT Search の OAI-SearchBot）＝AI検索での引用・流入を歓迎して許可。
      // ※許可は middleware の年齢ゲート素通り（SEARCH_BOT_RE）と2点セットで効く。
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: PRIVATE_PATHS },
      // 学習系AI＝全面ブロック
      ...TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
