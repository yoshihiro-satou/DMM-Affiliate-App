import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/mypage/', '/login/', '/register/', '/forgot-password/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
