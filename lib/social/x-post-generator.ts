import 'server-only'
import { fetchDailyDeals } from '@/lib/dmm/daily-deals'
import { fetchItemList, isVrItem } from '@/lib/dmm/client'
import { sortByDiscount } from '@/lib/ranking'
import { toLargeDmmImageUrl } from '@/lib/dmm/image'
import { TELEGRAM_CHANNEL_URL } from '@/lib/constants/telegram'
import type { DmmItem } from '@/types/dmm'

/**
 * 追加11: X（Twitter）手動投稿ジェネレータ。
 * API（従量課金）を使わず、コピペ即投稿できる投稿文を生成する。
 *
 * 設計は「拡散の科学」（kakusan_no_kagaku_summary.md / memory: project-x-posting-strategy）準拠。
 * 熱量パターン WOW / 知っトク / WANT を意図的に出し分ける。リンクは自社サイト（?ref=x）へ集約し、
 * X→サイト→（アフィリンク or Telegram購読）の流入を funnel_by_ref で計測する。
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export type XPostAngle = 'wow' | 'lifehack' | 'want' | 'telegram'

export type XPost = {
  angle: XPostAngle
  /** 熱量ラベル（管理画面表示用） */
  angleLabel: string
  /** コピペ用の投稿本文（リンク・ハッシュタグ込み） */
  text: string
  /** 添付推奨画像（DMM公式パッケージ・無改変で添付）。null ならテキストのみ */
  imageUrl: string | null
  /** 元作品タイトル（参考表示用） */
  itemTitle: string | null
  /** X の重み付き文字数（CJKは2）。280以内が目安 */
  weight: number
}

function discountRate(item: DmmItem): number {
  const price = Number(item.prices?.price)
  const list = Number(item.prices?.list_price)
  if (!price || !list || list <= price) return 0
  return Math.round((1 - price / list) * 100)
}

/** X の文字数カウント（CJK・全角は2、その他は1。URLは t.co 換算で23）。 */
function xWeight(text: string): number {
  let w = 0
  // URL は 23 固定換算
  const withoutUrls = text.replace(/https?:\/\/\S+/g, () => {
    w += 23
    return ''
  })
  for (const ch of withoutUrls) {
    const code = ch.codePointAt(0) ?? 0
    // CJK・全角・絵文字などは 2、ASCII 系は 1（簡易判定）
    w += code > 0x1100 ? 2 : 1
  }
  return w
}

function trimTitle(title: string, max = 22): string {
  const t = title.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function packageImage(item: DmmItem): string | null {
  const raw = item.imageURL?.large ?? item.imageURL?.list ?? null
  if (!raw) return null
  // 無改変で添付（DMM規約）。pt/ps→pl 正規化のみ行う
  return toLargeDmmImageUrl(raw)
}

/** 今日のセール/新作から、熱量別のX投稿案を生成する。 */
export async function buildXPosts(): Promise<XPost[]> {
  const [deals, newResult] = await Promise.all([
    fetchDailyDeals(50).catch(() => [] as DmmItem[]),
    fetchItemList({ sort: 'date', hits: 30, service: 'digital', floor: 'videoa' }).catch(
      () => null
    ),
  ])

  const ranked = sortByDiscount(deals).filter((it) => discountRate(it) >= 10)
  const fresh = (newResult?.items ?? []).filter((it) => !isVrItem(it))

  const saleLink = `${SITE_URL}/sale?ref=x`
  const newLink = `${SITE_URL}/new?ref=x`

  const posts: XPost[] = []

  // ① WOW（驚き）: 最大割引の作品を衝撃コピーで
  const top = ranked[0]
  if (top) {
    const rate = discountRate(top)
    const text = [
      `【衝撃${rate}%OFF】「${trimTitle(top.title)}」が今だけ大幅値下げ🔥`,
      '本日限りの特価、見逃すと損です👇',
      saleLink,
      '#FANZA #セール',
    ].join('\n')
    posts.push({
      angle: 'wow',
      angleLabel: 'WOW（驚き）',
      text,
      imageUrl: packageImage(top),
      itemTitle: top.title,
      weight: xWeight(text),
    })
  }

  // ② 知っトク（ライフハック）: セールの仕組みを「いいこと聞いた」で
  if (ranked.length > 0) {
    const maxRate = discountRate(ranked[0])
    const text = [
      `知らないと損😳 FANZAのセールは毎日入れ替わるって知ってた？`,
      `今日は最大${maxRate}%OFF。狙い目をまとめてチェック👇`,
      saleLink,
      '#FANZA #お得情報',
    ].join('\n')
    posts.push({
      angle: 'lifehack',
      angleLabel: '知っトク（ライフハック）',
      text,
      imageUrl: packageImage(ranked[1] ?? ranked[0]),
      itemTitle: (ranked[1] ?? ranked[0]).title,
      weight: xWeight(text),
    })
  }

  // ③ WANT（潜在物欲）: 新作を画像インパクト主導で
  const fresh0 = fresh[0]
  if (fresh0) {
    const text = [
      `「${trimTitle(fresh0.title)}」ついに配信開始✨`,
      '気になる新作はこちら👇',
      newLink,
      '#FANZA #新作',
    ].join('\n')
    posts.push({
      angle: 'want',
      angleLabel: 'WANT（潜在物欲）',
      text,
      imageUrl: packageImage(fresh0),
      itemTitle: fresh0.title,
      weight: xWeight(text),
    })
  }

  // ④ Telegram集客: セール速報チャンネルへ誘導
  {
    const text = [
      '毎日のFANZAセール速報、見逃したくない人はTelegramが楽📲',
      '登録不要でサクッと受け取れます👇',
      TELEGRAM_CHANNEL_URL,
      '#FANZA #セール速報',
    ].join('\n')
    posts.push({
      angle: 'telegram',
      angleLabel: 'Telegram集客',
      text,
      imageUrl: top ? packageImage(top) : null,
      itemTitle: null,
      weight: xWeight(text),
    })
  }

  return posts
}
