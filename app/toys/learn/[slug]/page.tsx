import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { DmmItem } from '@/types/dmm'
import { LESSONS, getLesson } from '@/lib/toys/lessons'
import { resolveRecommendSlots } from '@/lib/toys/recommend'
import { calcDiscountRate, parsePrice } from '@/lib/ranking'
import { GridCard } from '@/components/product/GridCard'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600
// レッスンは静的有限集合。未知 slug は正規の 404 にする（ソフト404を作らない）。
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lesson = getLesson(slug)
  if (!lesson) return { title: 'おとなのおもちゃ ガイド' }

  const title = lesson.metaTitle ?? `${lesson.title}｜おとなのおもちゃ 初心者ガイド`
  const description = `${lesson.lead} 使い方・お手入れ・選び方の基本と、今おトクなおすすめ商品をまとめました。`
  return {
    title,
    description,
    alternates: { canonical: `/toys/learn/${slug}` },
    openGraph: { title: `${lesson.title} | FANZAピックス`, description, url: `/toys/learn/${slug}` },
  }
}

export default async function ToysLessonPage({ params }: Props) {
  const { slug } = await params
  const lesson = getLesson(slug)
  if (!lesson) notFound()

  // 関連レッスン（内部リンク網）
  const related = (lesson.related ?? [])
    .map((s) => getLesson(s))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)

  // 商品提案は動的解決（取得失敗しても本文は出す）
  let picks: DmmItem[] = []
  let deals: DmmItem[] = []
  try {
    const resolved = await resolveRecommendSlots(lesson)
    picks = resolved.picks
    deals = resolved.deals
  } catch {
    picks = []
    deals = []
  }

  // deals の最大割引率・最大割引額（見出しの動的訴求用。API実値由来＝景表法セーフ）
  const dealMaxOff = deals.reduce(
    (m, d) => Math.max(m, calcDiscountRate(d.prices.price, d.prices.list_price) ?? 0),
    0
  )
  const dealMaxYen = deals.reduce((m, d) => {
    const p = parsePrice(d.prices.price)
    const l = parsePrice(d.prices.list_price)
    return Math.max(m, p !== null && l !== null && l > p ? l - p : 0)
  }, 0)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: lesson.faq.map((f) => ({
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
      { '@type': 'ListItem', position: 2, name: 'おとなのおもちゃ', item: `${SITE_URL}/toys` },
      { '@type': 'ListItem', position: 3, name: lesson.title, item: `${SITE_URL}/toys/learn/${lesson.slug}` },
    ],
  }
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lesson.title,
    description: lesson.lead,
    url: `${SITE_URL}/toys/learn/${lesson.slug}`,
    publisher: { '@type': 'Organization', name: 'FANZAピックス', url: SITE_URL },
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-6 py-9">
        {/* パンくず + ヘッダー */}
        <header className="flex flex-col gap-2">
          <nav className="text-[11px] text-white/45">
            <Link href="/toys" className="hover:text-white/70">おとなのおもちゃ</Link>
            <span className="px-1.5">›</span>
            <span className="text-white/60">{lesson.level}</span>
          </nav>
          <h1 className="text-[22px] font-black leading-tight tracking-tight text-white">{lesson.title}</h1>
          <p className="text-[13px] leading-6 text-white/65">{lesson.lead}</p>
        </header>

        {/* 本文 */}
        <article className="flex flex-col gap-3.5">
          {lesson.body.map((para, i) => (
            <p key={i} className="text-[13px] leading-7 text-white/75">{para}</p>
          ))}
        </article>

        {/* 今おトク枠（読了点に高割引品を注入） */}
        {deals.length > 0 && (
          <section className="flex flex-col gap-2.5 rounded-2xl border border-red-700/30 bg-red-600/[0.07] p-4">
            <h2 className="text-[14px] font-black text-white">
              💡 今だけ最大{dealMaxOff}%OFF
              {dealMaxYen > 0 ? `・${dealMaxYen.toLocaleString('ja-JP')}円引き` : ''}｜このレッスンに合うセール品
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {deals.map((item) => (
                <GridCard key={item.content_id} item={item} />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-white/60">
              📲 値下げを見逃したくない人は、毎日0時にTelegramで（無料・アプリ不要）。
            </p>
            <TelegramJoinCard placement="toys_learn_deals" variant="footer" />
          </section>
        )}

        {/* おすすめ（学びにひもづく厳選） */}
        {picks.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[15px] font-black text-white">このレッスンに合うおすすめ</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {picks.map((item) => (
                <GridCard key={item.content_id} item={item} />
              ))}
            </div>
            <p className="text-[10px] text-white/35">PR · 価格・割引は掲載時点のものです · 18歳未満は購入できません</p>
          </section>
        )}

        {/* FAQ */}
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-black text-white">よくある質問</h2>
          {lesson.faq.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[13px] font-bold text-white">{f.q}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </section>

        {/* 内部リンク網（関連レッスン + ハブ + セール） */}
        <section className="flex flex-col gap-2.5 border-t border-white/8 pt-6">
          {related.length > 0 && (
            <>
              <h2 className="text-[14px] font-black text-white">あわせて読みたい</h2>
              <div className="flex flex-col gap-2">
                {related.map((l) => (
                  <Link
                    key={l.slug}
                    href={`/toys/learn/${l.slug}`}
                    className="rounded-xl border border-white/8 bg-white/3 p-3.5 transition-colors hover:border-red-500/40 hover:bg-red-950/20"
                  >
                    <p className="text-[13px] font-bold text-white">{l.title}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <Link href="/toys" className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-bold text-white/80 hover:border-red-500/40">
              ガイドのトップへ
            </Link>
            <Link href="/toys/sale" className="rounded-full border border-red-700/40 bg-red-600/10 px-3 py-1.5 text-[12px] font-bold text-red-400 hover:border-red-500">
              今日のセールを見る →
            </Link>
          </div>
        </section>

        <TelegramJoinCard placement="toys_learn" />
      </div>
    </main>
  )
}
