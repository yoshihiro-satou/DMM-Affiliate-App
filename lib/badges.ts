export type BadgeType =
  | 'WELCOME'
  | 'STREAK_3'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'COLLECTOR_10'
  | 'COLLECTOR_50'
  | 'SERIES_COMPLETE'
  | 'REACTOR_10'

export type BadgeDef = {
  type: BadgeType
  label: string
  description: string
  emoji: string
  points: number
}

export const BADGE_DEFS: Record<BadgeType, BadgeDef> = {
  WELCOME: {
    type: 'WELCOME',
    label: 'ようこそ',
    description: '初めてログインしました',
    emoji: '👋',
    points: 10,
  },
  STREAK_3: {
    type: 'STREAK_3',
    label: '3日連続',
    description: '3日連続でログインしました',
    emoji: '🔥',
    points: 10,
  },
  STREAK_7: {
    type: 'STREAK_7',
    label: '1週間連続',
    description: '7日連続でログインしました',
    emoji: '⚡',
    points: 20,
  },
  STREAK_30: {
    type: 'STREAK_30',
    label: '30日連続',
    description: '30日連続でログインしました',
    emoji: '💎',
    points: 50,
  },
  COLLECTOR_10: {
    type: 'COLLECTOR_10',
    label: 'コレクター',
    description: 'お気に入りを10件追加しました',
    emoji: '⭐',
    points: 10,
  },
  COLLECTOR_50: {
    type: 'COLLECTOR_50',
    label: 'マスターコレクター',
    description: 'お気に入りを50件追加しました',
    emoji: '🏆',
    points: 30,
  },
  SERIES_COMPLETE: {
    type: 'SERIES_COMPLETE',
    label: 'シリーズ完走',
    description: 'シリーズをすべて読みました',
    emoji: '📚',
    points: 20,
  },
  REACTOR_10: {
    type: 'REACTOR_10',
    label: 'リアクター',
    description: 'スワイプを10回しました',
    emoji: '👍',
    points: 10,
  },
}

export const ALL_BADGE_TYPES = Object.keys(BADGE_DEFS) as BadgeType[]
