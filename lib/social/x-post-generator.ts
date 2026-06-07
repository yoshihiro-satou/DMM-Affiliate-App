import 'server-only'
import { fetchSaleItems, fetchItemList, isVrItem } from '@/lib/dmm/client'
import { sortBySaleAppeal, calcDiscountRate, parsePrice } from '@/lib/ranking'
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

/** スレッド投稿の1ツイート分。連投する順に並ぶ（先頭=1ツイート目、以降=リプライ連投）。 */
export type XPostSegment = {
  /** 連投順ラベル（管理画面表示用） */
  label: string
  /** コピペ用の本文 */
  text: string
  /** 添付候補画像（無改変） */
  images: string[]
  /** サンプル動画URL（手動でDL→添付する用）。無ければ null */
  movieUrl?: string | null
  /** X の重み付き文字数 */
  weight: number
}

export type XPost = {
  angle: XPostAngle
  /** 熱量ラベル（管理画面表示用） */
  angleLabel: string
  /**
   * スレッド投稿の場合のみ設定。先頭ツイートを投稿 → 各セグメントを順にリプライ連投する。
   * thread がある場合 text/images はフック（1ツイート目）と同じものを入れておく。
   */
  thread?: XPostSegment[]
  /** コピペ用の投稿本文（リンク・ハッシュタグ込み） */
  text: string
  /** 添付候補画像（先頭=パッケージ、以降=サンプル画像全部・無改変で添付）。その都度選んで使う */
  images: string[]
  /** 元作品タイトル（参考表示用） */
  itemTitle: string | null
  /** X の重み付き文字数（CJKは2）。280以内が目安 */
  weight: number
}

/** 割引率（%）。価格差が無ければ 0。"698~" 等の表記揺れは calcDiscountRate が吸収する。 */
function discountRate(item: DmmItem): number {
  return calcDiscountRate(item.prices?.price, item.prices?.list_price) ?? 0
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

/**
 * 添付候補画像を集める: 先頭にパッケージ（大）、続けてサンプル画像（大優先・無ければ小）を全部。
 * すべて無改変（DMM規約）。重複・空は除外。その都度この中から選んで添付する想定。
 */
function collectImages(item: DmmItem): string[] {
  const out: string[] = []
  const pkg = toLargeDmmImageUrl(item.imageURL?.large ?? item.imageURL?.list ?? null)
  if (pkg) out.push(pkg)
  const samples = item.sampleImageURL?.sample_l?.image ?? item.sampleImageURL?.sample_s?.image ?? []
  for (const url of samples) {
    if (url) out.push(url)
  }
  return [...new Set(out)]
}

/** サンプル動画URL（大きいサイズ優先）。フック投稿に添付する想定。 */
function sampleMovieUrl(item: DmmItem): string | null {
  const m = item.sampleMovieURL
  return m?.size_720_480 ?? m?.size_644_414 ?? m?.size_560_360 ?? m?.size_476_306 ?? null
}

/** 作品のジャンル名一覧。 */
function genreNames(item: DmmItem): string[] {
  return (item.iteminfo?.genre ?? []).map((g) => g.name ?? '').filter(Boolean)
}

/**
 * ジャンルから「タイトルから想像できる卑猥な一言」を1本選ぶ。
 * 最初にマッチしたジャンルの煽り文を採用。マッチ無しは汎用プールから content_id で安定選択。
 */
const GENRE_HOOKS: { match: RegExp; line: string }[] = [
  { match: /爆乳/, line: 'この爆乳に挟まれて窒息したい…マジで規格外🤤' },
  { match: /巨乳|おっぱい/, line: 'このおっぱい、揺れ方がもう反則…ずっと見てられる🥵' },
  { match: /痴女/, line: '完全に主導権握られてる…こんな風に攻められたら抗えない😳' },
  { match: /人妻|熟女/, line: '大人の女の色気がエグい…この余裕に全部持っていかれる😩' },
  { match: /中出し/, line: '最後まで生々しすぎる…これは保存しとかないと後悔するやつ🔥' },
  { match: /素人/, line: 'リアルすぎて逆にやばい…素人さんのこの感じが一番くる🥵' },
  { match: /制服|女子|JK/, line: '背徳感がすごい…見ちゃいけない気がするのに止まらない🫣' },
  { match: /ナンパ/, line: 'まさかここまで落ちるとは…ナンパの結末がえぐい😳' },
  { match: /スレンダー|美乳/, line: 'このスタイルは芸術…細いのに出るとこ出てて反則🤤' },
  { match: /電マ|おもちゃ|拘束/, line: '逃げ場ナシで攻められてる…この表情がたまらん🥵' },
]

const GENERIC_HOOKS = [
  'この表情はずるい…完全に理性持っていかれた🤤',
  'え、これ今日無料級で見れるの…？ヤバすぎでしょ🥵',
  'サンプルの時点で危険…本編どうなっちゃうの😳',
  'この子、絶対バズる…保存しとかないと損するやつ🔥',
]

function suggestiveLead(item: DmmItem): string {
  const genres = genreNames(item)
  for (const g of genres) {
    const hit = GENRE_HOOKS.find((h) => h.match.test(g))
    if (hit) return hit.line
  }
  // content_id を数値化して安定的に1本選ぶ（同作品で毎回同じ煽りになる）
  const seed = [...item.content_id].reduce((a, c) => a + c.charCodeAt(0), 0)
  return GENERIC_HOOKS[seed % GENERIC_HOOKS.length]
}

/** リーチ狙いのハッシュタグ。固定の高リーチ枠 + ジャンル由来を最大2つ。 */
function reachHashtags(item: DmmItem): string {
  const base = ['#エロ動画', '#FANZA']
  const genreTags: string[] = []
  for (const g of genreNames(item)) {
    // 1〜6文字程度のジャンルだけタグ化（長文ジャンルはタグに不向き）
    const t = g.replace(/\s/g, '')
    if (t.length >= 2 && t.length <= 6) genreTags.push(`#${t}`)
    if (genreTags.length >= 2) break
  }
  return [...base, ...genreTags].join(' ')
}

/** 価格表記（"498" → "498円"）。表記揺れ時は元文字列に円を付ける。 */
function priceLabel(item: DmmItem): string | null {
  const raw = item.prices?.price
  if (!raw) return null
  const n = parsePrice(raw)
  return n ? `${n.toLocaleString('ja-JP')}円` : `${raw}円`
}

/**
 * スレッド投稿を組み立てる共通ヘルパー。
 * ①ツイート目=フック（卑猥な一言＋サンプル動画/画像＋リーチ系タグ・リンク無し）、
 * ②ツイート目=①へのリプライ（タイトル・情報・サイト/外部リンク）。
 * リンクをリプライに逃がすことでフックの純粋なリーチを最大化する（Xのリンク抑制対策）。
 */
function makeThreadPost(opts: {
  angle: XPostAngle
  angleLabel: string
  item: DmmItem
  hookText: string
  replyText: string
}): XPost {
  const { angle, angleLabel, item, hookText, replyText } = opts
  const hookImages = collectImages(item)
  const thread: XPostSegment[] = [
    {
      label: '①ツイート目（フック・動画/画像を添付）',
      text: hookText,
      images: hookImages,
      movieUrl: sampleMovieUrl(item),
      weight: xWeight(hookText),
    },
    {
      label: '②ツイート目（①へのリプライ・リンク）',
      text: replyText,
      images: [],
      weight: xWeight(replyText),
    },
  ]
  return {
    angle,
    angleLabel,
    thread,
    text: hookText,
    images: hookImages,
    itemTitle: item.title,
    weight: xWeight(hookText),
  }
}

/** 今日のセール/新作から、熱量別のX投稿案を生成する。 */
export async function buildXPosts(): Promise<XPost[]> {
  const [saleItems, newResult] = await Promise.all([
    // /sale と同じプール（動画系フロアのセール作品・VR除外）
    fetchSaleItems({ perFloor: 100, excludeVr: true }).catch(() => [] as DmmItem[]),
    fetchItemList({ sort: 'date', hits: 30, service: 'digital', floor: 'videoa' }).catch(
      () => null
    ),
  ])

  // 「評価が高い × 値引き幅が大きい」順に並べ、最低割引10%以上を投稿候補にする
  const ranked = sortBySaleAppeal(saleItems).filter((it) => discountRate(it) >= 10)
  const fresh = (newResult?.items ?? []).filter((it) => !isVrItem(it))

  const saleLink = `${SITE_URL}/sale?ref=x`
  const newLink = `${SITE_URL}/new?ref=x`

  // 「最大N%OFF」表記用の本日の実最大割引（高評価順とは別に正確な最大値を出す）
  const maxRate = ranked.reduce((m, it) => Math.max(m, discountRate(it)), 0)

  const posts: XPost[] = []

  // どのスレッドもフック（卑猥な一言＋サンプル動画＋リーチ系タグ）でリーチを取り、
  // リンクは②ツイート目（リプライ）に逃がす。作品はなるべく重複しないよう振り分ける。
  const top = ranked[0]
  const second = ranked[1] ?? top
  const fresh0 = fresh[0]
  const teaser = ranked[2] ?? fresh[1] ?? top

  // ① WOW（驚き）: 高評価×大幅値引きトップ → セール誘導
  if (top) {
    const rate = discountRate(top)
    const price = priceLabel(top)
    const hookText = [suggestiveLead(top), '', reachHashtags(top)].join('\n')
    const replyText = [
      `👆の作品はこちら`,
      `「${trimTitle(top.title, 34)}」`,
      '',
      price ? `🔥${rate}%OFFセール中（${price}）` : `🔥今だけ${rate}%OFFセール中`,
      '他のお得情報もサイトでまとめました👇',
      saleLink,
      '',
      '#FANZA #セール',
    ].join('\n')
    posts.push(
      makeThreadPost({
        angle: 'wow',
        angleLabel: 'WOW（驚き・トップセール）',
        item: top,
        hookText,
        replyText,
      })
    )
  }

  // ② 知っトク（ライフハック）: 別のセール作品で「セールは毎日入れ替わる」誘導
  if (second && second !== top) {
    const rate = discountRate(second)
    const price = priceLabel(second)
    const hookText = [suggestiveLead(second), '', reachHashtags(second)].join('\n')
    const replyText = [
      `👆これ「${trimTitle(second.title, 30)}」`,
      price ? `今だけ${rate}%OFF（${price}）なの知ってた？😳` : `今だけ${rate}%OFFなの知ってた？😳`,
      '',
      `FANZAのセールは毎日入れ替わる。今日は最大${maxRate}%OFF🔥`,
      '狙い目はサイトにまとめました👇',
      saleLink,
      '',
      '#FANZA #お得情報',
    ].join('\n')
    posts.push(
      makeThreadPost({
        angle: 'lifehack',
        angleLabel: '知っトク（ライフハック）',
        item: second,
        hookText,
        replyText,
      })
    )
  }

  // ③ WANT（潜在物欲）: 新作を画像インパクト主導で → 新作ページ誘導
  if (fresh0) {
    const hookText = [suggestiveLead(fresh0), '', reachHashtags(fresh0)].join('\n')
    const replyText = [
      `👆の新作「${trimTitle(fresh0.title, 30)}」`,
      'ついに配信開始✨ これは早めにチェック案件',
      '',
      '他の新着・お得情報もサイトでまとめました👇',
      newLink,
      '',
      '#FANZA #新作',
    ].join('\n')
    posts.push(
      makeThreadPost({
        angle: 'want',
        angleLabel: 'WANT（潜在物欲・新作）',
        item: fresh0,
        hookText,
        replyText,
      })
    )
  }

  // ④ Telegram集客: フックで引き込み → セール速報チャンネルへ誘導
  if (teaser) {
    const hookText = [suggestiveLead(teaser), '', reachHashtags(teaser)].join('\n')
    const replyText = [
      'こういうお得作品、毎日のFANZAセール速報で配信中📲',
      '見逃したくない人はTelegramが楽（登録不要）👇',
      TELEGRAM_CHANNEL_URL,
      '',
      '#FANZA #セール速報',
    ].join('\n')
    posts.push(
      makeThreadPost({
        angle: 'telegram',
        angleLabel: 'Telegram集客',
        item: teaser,
        hookText,
        replyText,
      })
    )
  }

  return posts
}
