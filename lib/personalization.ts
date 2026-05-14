import type { DmmItem } from '@/types/dmm'

export type SwipeEntry = {
  item: DmmItem
  direction: 'like' | 'skip'
}

export type PersonalizationScores = {
  genres: Record<number, number>
  actresses: Record<number, number>
}

// Converts swipe history + item metadata into genre/actress affinity scores.
// Like = +1, Skip = -0.5. Used by 011 (personalized recommendations).
export function computePersonalizationScores(swipes: SwipeEntry[]): PersonalizationScores {
  const genres: Record<number, number> = {}
  const actresses: Record<number, number> = {}

  for (const { item, direction } of swipes) {
    const weight = direction === 'like' ? 1 : -0.5

    for (const actress of item.iteminfo?.actress ?? []) {
      if (actress.id !== undefined) {
        actresses[actress.id] = (actresses[actress.id] ?? 0) + weight
      }
    }
    for (const genre of item.iteminfo?.genre ?? []) {
      if (genre.id !== undefined) {
        genres[genre.id] = (genres[genre.id] ?? 0) + weight
      }
    }
  }

  return { genres, actresses }
}

// Returns top N IDs sorted by score (descending), filtering out negative scores.
export function getTopScoredIds(scores: Record<number, number>, n = 5): number[] {
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([id]) => Number(id))
}
