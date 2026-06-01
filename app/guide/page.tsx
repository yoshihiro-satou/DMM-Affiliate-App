import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchDailyDeals } from '@/lib/dmm/daily-deals'
import { todayJstLabel } from '@/lib/jst-date'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'FANZAをお得に使うガイド｜使い方・セール・割引',
  description:
    'FANZAをお得に使う方法を解説。セールの頻度・割引率、単品購入の仕組み、スマホでの探し方まで。FANZAピックスならスワイプ発見・推し通知・セール速報で見逃さずにお得に楽しめます。',
  alternates: { canonical: '/guide' },
  openGraph: {
    title: 'FANZAをお得に使うガイド | FANZAピックス',
    description: 'FANZAのセール・割引の仕組みと、お得に作品を探す方法をまとめました。',
    url: '/guide',
  },
}

function discountRate(price?: string, list?: string): number {
  const p = Number(price)
  const l = Number(list)
  if (!p || !l || l <= p) return 0
  return Math.round((1 - p / l) * 100)
}

const FAQ = [
  {
    q: 'FANZAのセールはどのくらいの頻度でありますか？',
    a: 'FANZAでは毎日のようにセールが入れ替わり、作品によっては最大90%OFFになることもあります。日替わりのため、こまめにチェックするのがお得です。',
  },
  {
    q: 'FANZAは月額制ですか？単品購入ですか？',
    a: '単品購入（買い切り）と見放題（サブスク）の両方があります。気になる作品だけを買うなら単品、たくさん観るなら見放題が向いています。セール対象は主に単品作品です。',
  },
  {
    q: 'FANZAピックスは何ができるサイトですか？',
    a: 'FANZAの作品をスワイプで発見でき、推し女優の新作やセール速報をプッシュ通知で受け取れます。お気に入り保存・値下げ通知にも対応した、FANZAをお得に楽しむための無料アプリ（PWA）です。',
  },
]

export default async function GuidePage() {
  const date = todayJstLabel()
  const deals = await fetchDailyDeals(50).catch(() => [])
  const maxOff = deals.reduce(
    (max, d) => Math.max(max, discountRate(d.prices?.price, d.prices?.list_price)),
    0
  )

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'FANZAをお得に使うガイド',
    description: metadata.description,
    url: `${SITE_URL}/guide`,
    publisher: { '@type': 'Organization', name: 'FANZAピックス', url: SITE_URL },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
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
      { '@type': 'ListItem', position: 2, name: 'お得に使うガイド', item: `${SITE_URL}/guide` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-6 py-10">
        {/* ヘッダー */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            GUIDE
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FANZAをお得に使うガイド
          </h1>
          <p className="text-[13px] leading-6 text-white/65">
            セールの仕組みから、スマホでの賢い探し方まで。
          </p>
          {maxOff > 0 && (
            <p className="rounded-full border border-red-700/40 bg-red-600/10 px-3 py-1 text-[12px] font-bold text-red-400">
              {date}時点 · 本日最大 {maxOff}%OFF 開催中
            </p>
          )}
        </header>

        {/* なぜFANZAピックスか */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">FANZAピックスを使うメリット</h2>
          <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-white/70">
            <li>・<strong className="text-white">スワイプで発見</strong>：気になる作品を直感でサクサク探せる</li>
            <li>・<strong className="text-white">推し女優の新作通知</strong>：登録した女優の新作が出たらすぐ通知</li>
            <li>・<strong className="text-white">セール速報</strong>：毎日深夜の最大90%OFFをいち早くお知らせ</li>
            <li>・<strong className="text-white">お気に入り・値下げ通知</strong>：気になる作品の値下がりを見逃さない</li>
          </ul>
        </section>

        {/* FANZAの特徴 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">FANZAの特徴</h2>
          <div className="flex flex-col gap-2.5">
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[13px] font-bold text-white">圧倒的なコンテンツ数</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                女優・ジャンル・シリーズが非常に豊富で、目的の作品を見つけやすいのが強みです。
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[13px] font-bold text-white">頻繁なセールと高い割引率</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                日替わりでセールが入れ替わり、対象作品は最大90%OFFになることも。買い時を逃さないことが節約のコツです。
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[13px] font-bold text-white">単品購入できる</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                サブスクだけでなく単品購入（買い切り）も可能。気になる作品だけをお得に手に入れられます。
              </p>
            </div>
          </div>
        </section>

        {/* お得に使うコツ（内部リンク） */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">お得に楽しむ3ステップ</h2>
          <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-white/70">
            <p>
              ① <Link href="/sale" className="font-bold text-red-400 hover:text-red-300">セールページ</Link>
              で当日の割引作品を割引率順にチェック
            </p>
            <p>
              ② <Link href="/ranking" className="font-bold text-red-400 hover:text-red-300">ランキング</Link>
              で評価の高い人気作を把握
            </p>
            <p>
              ③ <Link href="/pwa" className="font-bold text-red-400 hover:text-red-300">ホーム画面に追加</Link>
              して、推し女優の新作・セール速報を通知で受け取る
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-black text-white">よくある質問</h2>
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[14px] font-bold text-white">{f.q}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </section>

        <p className="text-center text-[10px] text-white/35">
          PR · 本ページはFANZAアフィリエイトを利用しています
        </p>
      </div>
    </main>
  )
}
