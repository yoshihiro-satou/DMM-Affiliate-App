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
} as const

export type FloorKey = keyof typeof FANZA_FLOORS
