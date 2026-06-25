import type { Metadata } from 'next'
import Link from 'next/link'
import type { DmmItem } from '@/types/dmm'
import { fetchToysSaleItems } from '@/lib/dmm/client'
import { sortByDiscount, calcDiscountRate } from '@/lib/ranking'
import { todayJstLabel } from '@/lib/jst-date'
import { GridCard } from '@/components/product/GridCard'
import { TelegramJoinCard } from '@/components/telegram/TelegramJoinCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const revalidate = 3600

// 日付・最大割引率はタイトル/descに使い、canonical は /toys/sale に固定（鮮度シグナル）。
// 「最大N%OFF」は必ず API 実値の動的注入（手書き数字は景表法・優良誤認）。取得済み結果は
// React cache でページ本体の取得と重複排除されるため追加 API コールは実質ゼロ。
export async function generateMetadata(): Promise<Metadata> {
  const date = todayJstLabel()
  let maxOff = 0
  let count = 0
  try {
    const sale = await fetchToysSaleItems({ perFloor: 100 })
    count = sale.length
    maxOff = sale.reduce(
      (m, it) => Math.max(m, calcDiscountRate(it.prices.price, it.prices.list_price) ?? 0),
      0
    )
  } catch {
    // 取得失敗時は数字なしのタイトルにフォールバック
  }
  const offLabel = maxOff > 0 ? `【最大${maxOff}%OFF】` : ''
  const title = `${offLabel}おとなのおもちゃ セール・割引（${date}更新）`
  const description =
    count > 0
      ? `${date}時点でFANZAが値下げ中の大人のおもちゃ${count}件を割引率の高い順に。最大${maxOff}%OFF、ローター・吸引・カップル向けまで今日の安い順でまとめました。`
      : `${date}時点でFANZAで値引き中の大人のおもちゃ一覧。割引率の高い順に掲載。ローター・吸引・カップル向けなど、今おトクな商品をまとめてチェックできます。`
  return {
    title,
    description,
    openGraph: { title: `${title} | FANZAピックス`, description, url: '/toys/sale' },
    alternates: { canonical: '/toys/sale' },
  }
}

export default async function ToysSalePage() {
  const header = (
    <div className="border-b border-white/8 px-4 py-4">
      <span
        className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        TOYS SALE
      </span>
      <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">
        おとなのおもちゃ セール・割引品
      </h1>
      <p className="mt-0.5 text-[11px] text-white/50">
        {todayJstLabel()}更新 · 値引き中の商品を割引率の高い順に掲載
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/toys" className="inline-block text-[11px] text-red-400 hover:text-red-300">
          ← おとなのおもちゃ ガイドに戻る
        </Link>
        <Link href="/toys/learn/hajimete-erabikata" className="inline-block text-[11px] text-red-400 hover:text-red-300">
          初めてで選び方に迷ったら →
        </Link>
      </div>
    </div>
  )

  // データ取得のみ try/catch に閉じ込め、JSX は外で構築する（JSX-in-try の lint 回避）
  let items: DmmItem[] = []
  let failed = false
  try {
    const saleItems = await fetchToysSaleItems({ perFloor: 100 })
    items = sortByDiscount(saleItems).slice(0, 60)
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
    name: 'おとなのおもちゃ セール・割引品',
    itemListElement: items.slice(0, 10).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title,
      url: item.affiliateURL,
    })),
  }
  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'おとなのおもちゃ', item: `${SITE_URL}/toys` },
      { '@type': 'ListItem', position: 3, name: 'セール・割引品', item: `${SITE_URL}/toys/sale` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      {header}
      <p className="px-4 pb-2 pt-1 text-[11px] text-white/55">
        PR · 割引率の高い順 · 値引き中{items.length}件 · 18歳未満は購入できません
      </p>
      <div className="px-3 pb-1">
        <TelegramJoinCard placement="toys_sale" />
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, i) => (
            <GridCard key={item.content_id} item={item} rank={i + 1} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-[13px] text-white/55">
          現在値引き中の商品が見つかりませんでした。時間をおいて再度ご確認ください。
        </p>
      )}
    </main>
  )
}
