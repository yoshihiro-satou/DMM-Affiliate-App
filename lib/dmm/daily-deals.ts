import 'server-only'
import { cache } from 'react'
import { fetchDailyDealContents } from './scraper'
import { fetchDailySaleItems } from './client'
import type { DmmItem } from '@/types/dmm'

function buildAffiliateUrl(cid: string): string {
  const affiliateId = process.env.DMM_AFFILIATE_ID ?? 'yoshihirock-990'
  const productUrl = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${cid}/`
  return `https://al.dmm.co.jp/?lurl=${encodeURIComponent(productUrl)}&af_id=${affiliateId}&ch=toolbar&ch_id=tool`
}

// React.cache() でリクエスト内の重複呼び出しを排除（ページキャッシュは app/page.tsx の revalidate=3600 が担う）
export const fetchDailyDeals = cache(async (hits = 50): Promise<DmmItem[]> => {
  const contents = await fetchDailyDealContents(hits)

  if (contents.length === 0) {
    return fetchDailySaleItems(hits)
  }

  const today = new Date().toISOString().slice(0, 10)

  return contents.map(c => {
    const lowestPrice = c.salesInfo.lowestPrice
    const campaign = c.salesInfo.campaign

    return {
      content_id: c.id,
      title: c.title,
      affiliateURL: buildAffiliateUrl(c.id),
      imageURL: {
        list: c.packageImage.mediumUrl,
        small: c.packageImage.mediumUrl,
        large: c.packageImage.largeUrl,
      },
      sampleImageURL: c.sampleImages.length > 0 ? {
        sample_l: {
          image: c.sampleImages.reduce<string[]>((arr, si) => {
            arr[si.number - 1] = si.largeUrl
            return arr
          }, []),
        },
      } : undefined,
      sampleMovieURL: c.sampleMovie?.mp4Url ? {
        size_560_360: c.sampleMovie.mp4Url,
        size_476_306: c.sampleMovie.hlsUrl ?? undefined,
      } : undefined,
      prices: {
        price: lowestPrice
          ? String(lowestPrice.discountPrice ?? lowestPrice.price)
          : undefined,
        list_price: lowestPrice?.discountPrice != null
          ? String(lowestPrice.price)
          : undefined,
      },
      review: c.review ? {
        average: String(c.review.average),
        count: c.review.count,
      } : undefined,
      campaign: campaign ? [{
        date_begin: today,
        date_end: campaign.endAt,  // フルISO文字列を保持してカウントダウンの時間精度を維持
        title: campaign.name,
      }] : undefined,
      date: c.deliveryStartAt?.slice(0, 10),
    } satisfies DmmItem
  })
})
