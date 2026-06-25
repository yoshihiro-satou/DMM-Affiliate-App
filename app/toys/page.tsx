import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchToysSaleItems } from '@/lib/dmm/client'
import { calcDiscountRate } from '@/lib/ranking'
import { todayJstLabel } from '@/lib/jst-date'
import { LESSONS } from '@/lib/toys/lessons'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'おとなのおもちゃ 初めてガイド｜選び方・使い方・セール',
  description:
    '初めてのおとなのおもちゃの選び方を、素材・サイズ・静かさ・お手入れの基本からやさしく解説。一人で・カップルで・ギフトにと、目的別の入口と今日のセール割引品をまとめました。',
  alternates: { canonical: '/toys' },
  openGraph: {
    title: 'おとなのおもちゃ 初めてガイド | FANZAピックス',
    description: '選び方・使い方・お手入れの基本と、目的別の入口・今日のセール割引品をまとめました。',
    url: '/toys',
  },
}

// 玄関の3扉（一人・カップル・ギフト）。各扉は代表レッスン or 専用ページへ。
const DOORS = [
  {
    emoji: '🌙',
    label: '一人で・初めて',
    desc: '不安をなくす選び方から。痛くない・静かな入門タイプ',
    href: '/toys/learn/hajimete-erabikata',
  },
  {
    emoji: '💞',
    label: 'カップルで',
    desc: '二人で楽しむ・合意とコミュニケーション。遠隔対応も',
    href: '/toys/learn/couple-osusume',
  },
  {
    emoji: '🎁',
    label: 'ギフトに',
    desc: '女性へさりげなく。ボディケアのように贈れるデザイン',
    href: '/toys/gift',
  },
]

const LADDER_FAQ = [
  {
    q: 'おとなのおもちゃは初めてでも大丈夫ですか？',
    a: '刺激の穏やかな入門タイプ（ローターなど）から始めれば、初めてでも扱いやすいです。素材はシリコンなどお手入れしやすいもの、静音・防水だと使う場所や衛生面で安心です。',
  },
  {
    q: 'どこで買うのがいいですか？',
    a: '単品で買い切りできるショップなら、気になった一台だけを試せます。セール対象の入門モデルから選ぶと初めてのハードルが下がります。',
  },
  {
    q: 'お手入れ・衛生面はどうすればいいですか？',
    a: '使用後はぬるま湯と専用クリーナー（または中性洗剤）で洗い、しっかり乾かして保管します。防水対応だと丸洗いしやすく衛生的です。潤滑剤は水溶性タイプが扱いやすいです。',
  },
]

export default async function ToysHubPage() {
  const date = todayJstLabel()

  let maxOff = 0
  try {
    const sale = await fetchToysSaleItems({ perFloor: 60 })
    maxOff = sale.reduce(
      (max, d) => Math.max(max, calcDiscountRate(d.prices.price, d.prices.list_price) ?? 0),
      0
    )
  } catch {
    maxOff = 0
  }

  const beginnerLessons = LESSONS.filter((l) => l.level === '初級')
  const intermediateLessons = LESSONS.filter((l) => l.level === '中級')

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'おとなのおもちゃ 初めてガイド',
    description: metadata.description,
    url: `${SITE_URL}/toys`,
    publisher: { '@type': 'Organization', name: 'FANZAピックス', url: SITE_URL },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LADDER_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'おとなのおもちゃ ガイド', item: `${SITE_URL}/toys` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        {/* ヘッダー */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            TOYS GUIDE
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            おとなのおもちゃ 初めてガイド
          </h1>
          <p className="text-[13px] leading-6 text-white/65">
            選び方・使い方・お手入れの基本を、やさしく。一人で・カップルで・ギフトにと、目的に合わせて選べます。
          </p>
          {maxOff > 0 && (
            <Link
              href="/toys/sale"
              className="rounded-full border border-red-700/40 bg-red-600/10 px-3 py-1 text-[12px] font-bold text-red-400 hover:border-red-500"
            >
              {date}時点 · 本日最大 {maxOff}%OFF 開催中 →
            </Link>
          )}
        </header>

        {/* 3扉 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">目的から選ぶ</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {DOORS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/3 p-4 transition-colors hover:border-red-500/40 hover:bg-red-950/20"
              >
                <span className="text-[22px]">{d.emoji}</span>
                <span className="text-[14px] font-bold text-white">{d.label}</span>
                <span className="text-[11px] leading-relaxed text-white/60">{d.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 学びの梯子 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">学びの梯子（初級 → ステップアップ）</h2>
          <p className="text-[12px] leading-relaxed text-white/55">
            まずは初級から。不安や疑問をひとつずつ解消しながら、自分に合う一台を見つけていきましょう。
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold tracking-wider text-red-500/80">初級</p>
            {beginnerLessons.map((l) => (
              <Link
                key={l.slug}
                href={`/toys/learn/${l.slug}`}
                className="rounded-xl border border-white/8 bg-white/3 p-3.5 transition-colors hover:border-red-500/40 hover:bg-red-950/20"
              >
                <p className="text-[13px] font-bold text-white">{l.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/60">{l.lead}</p>
              </Link>
            ))}
            <p className="mt-1 text-[11px] font-bold tracking-wider text-red-500/80">中級</p>
            {intermediateLessons.map((l) => (
              <Link
                key={l.slug}
                href={`/toys/learn/${l.slug}`}
                className="rounded-xl border border-white/8 bg-white/3 p-3.5 transition-colors hover:border-red-500/40 hover:bg-red-950/20"
              >
                <p className="text-[13px] font-bold text-white">{l.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/60">{l.lead}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* セール導線 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">今日のセール</h2>
          <Link
            href="/toys/sale"
            className="flex items-center justify-between rounded-xl border border-red-700/40 bg-red-600/10 px-4 py-3.5 transition-colors hover:border-red-500"
          >
            <span className="flex flex-col">
              <span className="text-[14px] font-bold text-white">おとなのおもちゃ セール・割引品</span>
              <span className="text-[11px] text-white/55">割引率の高い順に掲載 · {date}更新</span>
            </span>
            <span className="text-[13px] font-bold text-red-400">見る →</span>
          </Link>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">よくある質問</h2>
          {LADDER_FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[14px] font-bold text-white">{f.q}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </section>

        <TelegramJoinCard placement="toys" />

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
          <Link href="/sale" className="text-white/50 hover:text-white/80">
            FANZAの動画セールも見る →
          </Link>
          <Link href="/" className="text-white/50 hover:text-white/80">
            FANZAピックス トップ
          </Link>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-white/35">
          PR · 本ページはFANZAアフィリエイトを利用しています · 18歳未満の閲覧・購入はできません
        </p>
      </div>
    </main>
  )
}
