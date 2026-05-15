import type { MetadataRoute } from 'next'
import { fetchActressList } from '@/lib/dmm/client'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanza-osusume.pages.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/actress`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  const result = await fetchActressList({ hits: 100, sort: 'id' }).catch(() => null)
  const actressRoutes: MetadataRoute.Sitemap = (result?.actress ?? []).map((a) => ({
    url: `${BASE_URL}/actress/${a.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...actressRoutes]
}
