import type { Metadata } from 'next'
import Link from 'next/link'
import type { DmmItem } from '@/types/dmm'
import { fetchItemList } from '@/lib/dmm/client'
import { WOMEN_WELLNESS_BRANDS } from '@/lib/toys/taxonomy'
import { GridCard } from '@/components/product/GridCard'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '女性へのギフトに選ばれるウェルネスアイテム｜さりげなく贈る',
  description:
    'ボディケアのように贈れる、デザイン性の高いウェルネスアイテムをギフト目線でまとめました。引かれずにさりげなく贈るための選び方・予算の目安も。',
  alternates: { canonical: '/toys/gift' },
  openGraph: {
    title: '女性へのギフトに選ばれるウェルネスアイテム | FANZAピックス',
    description: 'さりげなく贈れる、デザイン性の高いウェルネスアイテムをギフト目線でまとめました。',
    url: '/toys/gift',
  },
}

const GIFT_FAQ = [
  {
    q: '贈っても引かれませんか？',
    a: 'デザイン性が高くボディケア用品のような見た目のアイテムは、ギフトとして選ばれています。相手の好みや関係性を尊重し、押し付けにならないよう「選択肢のひとつ」として贈るのが好まれます。',
  },
  {
    q: 'どんなものが喜ばれますか？',
    a: '生活に馴染む落ち着いたデザインで、防水などお手入れが簡単なものが喜ばれやすいです。iroha のようにパッケージが上品なブランドは贈りやすいとされています。',
  },
  {
    q: '予算の目安は？',
    a: '数千円台から一万円台まで幅広く選べます。ラッピングやギフト対応のある商品を選ぶと特別感が出ます。',
  },
]

export default async function ToysGiftPage() {
  const header = (
    <div className="border-b border-white/8 px-4 py-4">
      <span
        className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        GIFT
      </span>
      <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">
        女性へのギフトに、さりげなく
      </h1>
      <p className="mt-1 text-[12px] leading-relaxed text-white/60">
        ボディケアのように贈れる、デザイン性の高いウェルネスアイテム。落ち着いた色やフォルム、お手入れのしやすさを基準に選ぶと外しにくいです。相手の好みや関係性を尊重し、あくまで選択肢のひとつとして。
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/toys" className="inline-block text-[11px] text-red-400 hover:text-red-300">
          ← おとなのおもちゃ ガイドに戻る
        </Link>
        <Link href="/toys/learn/gift-josei" className="inline-block text-[11px] text-red-400 hover:text-red-300">
          さりげなく贈る選び方を読む →
        </Link>
      </div>
    </div>
  )

  // 「ギフト」キーワードは男性向けの名器/オナホが大量に混じるため使わない。
  // 検証済みのクリーンな女性向けウェルネスブランド（iroha/Womanizer/Satisfyer）を
  // マージして「さりげなく贈れる」グリッドを作る。
  let items: DmmItem[] = []
  let failed = false
  try {
    const batches = await Promise.all(
      WOMEN_WELLNESS_BRANDS.map((kw) =>
        fetchItemList({ service: 'mono', floor: 'goods', keyword: kw, sort: 'review', hits: 20 })
          .then((r) => r.items)
          .catch(() => [] as DmmItem[])
      )
    )
    const seen = new Set<string>()
    const merged: DmmItem[] = []
    for (const list of batches) {
      for (const it of list) {
        if (seen.has(it.content_id)) continue
        seen.add(it.content_id)
        merged.push(it)
      }
    }
    items = merged.slice(0, 36)
  } catch {
    failed = true
  }

  if (failed) {
    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {header}
        <p className="py-16 text-center text-[13px] text-white/55">
          コンテンツを準備中です。しばらくお待ちください。
        </p>
      </main>
    )
  }

  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '女性へのギフト向けウェルネスアイテム',
    itemListElement: items.slice(0, 10).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
      url: item.affiliateURL,
    })),
  }
  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GIFT_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'おとなのおもちゃ', item: `${SITE_URL}/toys` },
      { '@type': 'ListItem', position: 3, name: 'ギフト', item: `${SITE_URL}/toys/gift` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {header}
      <p className="px-4 pb-2 pt-2 text-[11px] text-white/55">
        PR · ギフト向けの商品を掲載 · 18歳未満は購入できません
      </p>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <GridCard key={item.content_id} item={item} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-[13px] text-white/55">
          該当する商品が見つかりませんでした。時間をおいて再度ご確認ください。
        </p>
      )}

      <section className="border-t border-white/8 px-4 pb-8 pt-5">
        <h2 className="mb-3 text-[15px] font-black tracking-tight text-white">ギフトのよくある質問</h2>
        <div className="flex flex-col gap-2">
          {GIFT_FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/8 bg-white/3 p-3.5">
              <p className="text-[13px] font-bold text-white">{f.q}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <TelegramJoinCard placement="toys_gift" />
        </div>
      </section>
    </main>
  )
}
