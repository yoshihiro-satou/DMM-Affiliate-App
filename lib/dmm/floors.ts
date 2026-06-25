// FANZA digital サービスのフロア定義（FloorList API で確認済み）
export const FANZA_FLOORS = {
  videoa: {
    service: 'digital',
    floor: 'videoa',
    floorId: '43',
    name: 'ビデオ',
  },
  videoc: {
    service: 'digital',
    floor: 'videoc',
    floorId: '44',
    name: '素人',
  },
  nikkatsu: {
    service: 'digital',
    floor: 'nikkatsu',
    floorId: '45',
    name: '成人映画',
  },
  anime: {
    service: 'digital',
    floor: 'anime',
    floorId: '46',
    name: 'アニメ動画',
  },
  // mono（通販）= 大人のおもちゃ。FloorList API で floorId=75 を確認済み（2026-06-24）。
  // 在庫2万件超・ローション等の消耗品も同floor内。GenreList(75)=0 のため一覧は
  // 商品の iteminfo.genre 集計で作る（ジャンルIDは商品に実在＝article:'genre' で絞り込み可）。
  goods: {
    service: 'mono',
    floor: 'goods',
    floorId: '75',
    name: '大人のおもちゃ',
  },
} as const

export type FloorKey = keyof typeof FANZA_FLOORS
