const CACHE_NAME = 'fanza-v2'
const OFFLINE_PAGES = ['/', '/favorites']

// インストール: オフライン用ページをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_PAGES))
  )
  self.skipWaiting()
})

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// フェッチ: オフラインページのみネットワーク優先でキャッシュ
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return
  if (!OFFLINE_PAGES.includes(url.pathname)) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const toCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// プッシュ通知受信
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'FANZA お知らせ', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title || 'FANZA お知らせ', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
      tag: data.tag || 'fanza',
      requireInteraction: false,
    })
  )
})

// 通知タップ: 対象URLへ遷移
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus()
        }
        return clients.openWindow(url)
      })
  )
})
