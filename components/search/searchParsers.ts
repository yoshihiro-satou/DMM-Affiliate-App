import { parseAsString } from 'nuqs'

export const searchQueryParser = parseAsString.withDefault('')

export const searchSortParser = parseAsString
  .withOptions({ history: 'push' })
  .withDefault('rank')

export const SORT_OPTIONS = [
  { value: 'rank', label: '人気順' },
  { value: 'date', label: '新着順' },
  { value: 'review', label: '評価順' },
  { value: '-price', label: '価格（安い順）' },
  { value: 'price', label: '価格（高い順）' },
] as const
