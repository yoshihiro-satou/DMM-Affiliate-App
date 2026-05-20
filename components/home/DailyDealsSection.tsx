import { fetchDailyDeals } from '@/lib/dmm/daily-deals'
import { BentoGrid } from '@/components/layout/BentoGrid'

export async function DailyDealsSection() {
  const items = await fetchDailyDeals(12)
  if (items.length === 0) return null

  return <BentoGrid items={items} />
}
