import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FANZAピックス',
    short_name: 'FANZAピックス',
    description: 'FANZAのセール・ランキング・推し女優を管理するアプリ',
    lang: 'ja',
    dir: 'ltr',
    categories: ['entertainment', 'shopping', 'lifestyle'],
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#3b1060',
    theme_color: '#a435f0',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'セール',
        short_name: 'セール',
        url: '/sale',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'ランキング',
        short_name: 'ランキング',
        url: '/ranking',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'お気に入り',
        short_name: 'お気に入り',
        url: '/favorites',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '検索',
        short_name: '検索',
        url: '/search',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshots/mobile-1.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'セール・ランキング・推し女優をアプリ感覚で',
      },
      {
        src: '/screenshots/mobile-2.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'できること一覧',
      },
    ],
  }
}
