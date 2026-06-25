// おとなのおもちゃ（mono/goods・floorId 75）の振り分けタクソノミー。
// GenreList(75)=0 のため一覧は商品の iteminfo.genre 集計で作るが、ジャンルID自体は
// 商品に実在し article:'genre', article_id=<id> で絞り込める（2026-06-24 実測）。
// 下記IDは rank 上位100商品から採取した実在ジャンル（keyword頼みにしなくてよい素材）。

export const TOY_GENRE = {
  // 習熟度（学びの梯子に直結）
  beginner: 308625, // 初心者向け
  foreplay: 308653, // 前戯向け
  technician: 308641, // テクニシャン向け
  // 一人（solo）
  soloFloor: 308824, // 床オナ
  anany: 308842, // アナニー
  puniana: 308834, // ぷにあな
  // 消耗品（隣接スコープ）
  pepeLotion: 10105, // ペペローション
  // セール面
  onSaleNow: 10226, // セール開催中
  makerSale: 10224, // メーカーセール
  fanzaExclusiveSale: 309017, // FANZA独占セール
  under1000: 10095, // 1000円以下
  // 品質シグナル
  recommended: 10204, // おすすめ
  highRated2025: 308634, // 2025年高評価
  madeInJapan: 308839, // 日本製
} as const

export type SceneAxis = 'solo' | 'partner' | 'both'

// genreId → scene。solo ジャンルは実在、partner は薄いので keyword（カップル/二人で）併用。
export const sceneMap: Record<number, SceneAxis> = {
  [TOY_GENRE.soloFloor]: 'solo',
  [TOY_GENRE.anany]: 'solo',
  [TOY_GENRE.puniana]: 'solo',
  [TOY_GENRE.foreplay]: 'partner',
}

// ブランド seed（在庫確認済 floorId=75）。recommendSlots の指名アンカーに使う。
export const BRAND_SEEDS = {
  iroha: 'iroha',
  womanizer: 'Womanizer',
  satisfyer: 'Satisfyer',
  lovense: 'LOVENSE',
  tenga: 'TENGA',
} as const

// 女性向けウェルネス（ギフト／痛くない初心者）に確実に効くクリーンなブランド集合。
// DMM の「ギフト」「吸引」等の汎用キーワードは男性向けの名器/オナホが多数混じるため、
// 性別テーマのレッスン・扉ではこのブランド集合で引いて取り違えを防ぐ（2026-06-25 実測で確認）。
export const WOMEN_WELLNESS_BRANDS = [
  BRAND_SEEDS.iroha,
  BRAND_SEEDS.womanizer,
  BRAND_SEEDS.satisfyer,
]
