/**
 * Cloudflare Workers: Web Push 通知送信
 * RFC 8291 (Message Encryption) + RFC 8292 (VAPID) を Web Crypto API で実装
 *
 * 環境変数（wrangler secret put で登録）:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   VAPID_PUBLIC_KEY   ... base64url encoded 65-byte P-256 public key
 *   VAPID_PRIVATE_KEY_JWK ... JSON Web Key (stringify した文字列)
 *   VAPID_SUBJECT      ... mailto: or https: URL
 */

interface ScheduledController { readonly scheduledTime: number }
interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void
}

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY_JWK: string
  VAPID_SUBJECT: string
}

// ── Base64url ────────────────────────────────────────────────────────────────

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - (s.length % 4)) % 4, '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

// ── HMAC-SHA-256 ─────────────────────────────────────────────────────────────

async function hmac256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

// ── HKDF (RFC 5869) ──────────────────────────────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmac256(salt, ikm)
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length)
  let prev = new Uint8Array(0)
  let pos = 0
  for (let ctr = 1; pos < length; ctr++) {
    prev = await hmac256(prk, concat(prev, info, new Uint8Array([ctr])))
    const take = Math.min(length - pos, prev.length)
    out.set(prev.slice(0, take), pos)
    pos += take
  }
  return out
}

// ── VAPID JWT (RFC 8292) ──────────────────────────────────────────────────────

async function createVapidJWT(audience: string, env: Env): Promise<string> {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_KEY_JWK) as JsonWebKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const enc = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64urlEncode(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: env.VAPID_SUBJECT })))
  const input = `${header}.${claims}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, enc.encode(input))
  return `${input}.${b64urlEncode(sig)}`
}

// ── Web Push 暗号化 (RFC 8291 aes128gcm) ─────────────────────────────────────

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ body: Uint8Array }> {
  const enc = new TextEncoder()

  // ユーザー公開鍵
  const uaPub = await crypto.subtle.importKey(
    'raw', b64urlDecode(p256dh), { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // サーバー一時キーペア
  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const asPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey))
  const uaPubRaw = b64urlDecode(p256dh)

  // ECDH 共有秘密
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPub }, asKeyPair.privateKey, 256)
  )

  const authSecret = b64urlDecode(auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK_key = HKDF-Extract(auth_secret, ecdh_secret)
  const prkKey = await hkdfExtract(authSecret, ecdhSecret)
  // IKM = HKDF-Expand(PRK_key, "WebPush: info\0" || ua_pub || as_pub, 32)
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPubRaw, asPubRaw)
  const ikm = await hkdfExpand(prkKey, keyInfo, 32)

  // PRK = HKDF-Extract(salt, IKM)
  const prk = await hkdfExtract(salt, ikm)

  // CEK (16 bytes) と Nonce (12 bytes) を導出
  const cek = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\0'), 12)

  // AES-128-GCM 暗号化 (padding delimiter: 0x02)
  const plaintext = enc.encode(payload)
  const padded = new Uint8Array(plaintext.length + 1)
  padded.set(plaintext)
  padded[plaintext.length] = 2

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded)
  )

  // aes128gcm コンテンツヘッダ: salt(16) + rs(4) + keyid_len(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const keyIdLen = new Uint8Array([asPubRaw.length])
  const body = concat(salt, rs, keyIdLen, asPubRaw, ciphertext)

  return { body }
}

// ── Supabase REST ヘルパー ────────────────────────────────────────────────────

function sbHeaders(env: Env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

type NotificationRecord = {
  id: string
  user_id: string | null
  endpoint: string | null
  type: string
  payload: Record<string, unknown>
}

type SubscriptionRecord = {
  endpoint: string
  keys: { auth: string; p256dh: string }
}

async function getPendingNotifications(env: Env): Promise<NotificationRecord[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/notification_queue?status=eq.pending&select=id,user_id,endpoint,type,payload&limit=50`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) { console.error('[push-notify] getPending error:', res.status); return [] }
  return (await res.json()) as NotificationRecord[]
}

async function getSubscriptions(env: Env, userId: string): Promise<SubscriptionRecord[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/notification_subscriptions?user_id=eq.${userId}&select=endpoint,keys`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) return []
  return (await res.json()) as SubscriptionRecord[]
}

// ゲスト（user_id なし）の sale 行: endpoint 直指定で1件取得する
async function getSubscriptionByEndpoint(env: Env, endpoint: string): Promise<SubscriptionRecord[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/notification_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&select=endpoint,keys`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) return []
  return (await res.json()) as SubscriptionRecord[]
}

async function markNotification(env: Env, id: string, status: 'sent' | 'failed'): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/notification_queue?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({ status, sent_at: new Date().toISOString() }),
  })
}

async function deleteSubscription(env: Env, endpoint: string): Promise<void> {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/notification_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    { method: 'DELETE', headers: sbHeaders(env) }
  )
}

// ── 1件送信 ───────────────────────────────────────────────────────────────────

async function sendOne(
  sub: SubscriptionRecord,
  notifPayload: Record<string, unknown>,
  env: Env
): Promise<number> {
  const url = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const vapidJwt = await createVapidJWT(audience, env)

  const pushPayload = {
    title: (notifPayload.title as string) || 'FANZA お知らせ',
    body: (notifPayload.body as string) || '',
    url: (notifPayload.url as string) || '/',
    tag: (notifPayload.tag as string) || 'fanza',
  }

  const { body } = await encryptPayload(JSON.stringify(pushPayload), sub.keys.p256dh, sub.keys.auth)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${vapidJwt},k=${env.VAPID_PUBLIC_KEY}`,
    },
    body,
  })

  return res.status
}

// ── メインロジック ─────────────────────────────────────────────────────────────

async function runPushNotify(env: Env): Promise<void> {
  console.log('[push-notify] start')

  const notifications = await getPendingNotifications(env)
  if (notifications.length === 0) { console.log('[push-notify] no pending notifications'); return }

  for (const notif of notifications) {
    // 送信先サブスクリプションを解決する。
    // - ログイン勢: user_id で購読を引く（複数デバイス対応）
    // - ゲスト sale: endpoint 直指定で1件引く
    const subs = notif.user_id
      ? await getSubscriptions(env, notif.user_id)
      : notif.endpoint
        ? await getSubscriptionByEndpoint(env, notif.endpoint)
        : []
    const ref = notif.user_id ?? notif.endpoint ?? 'unknown'

    if (!notif.user_id && !notif.endpoint) {
      await markNotification(env, notif.id, 'failed')
      continue
    }

    if (subs.length === 0) {
      await markNotification(env, notif.id, 'sent') // 購読解除済み
      continue
    }

    let anySuccess = false
    for (const sub of subs) {
      try {
        const status = await sendOne(sub, notif.payload, env)
        if (status === 201 || status === 202) {
          anySuccess = true
        } else if (status === 410 || status === 404) {
          // 購読期限切れ → 削除
          await deleteSubscription(env, sub.endpoint)
          console.log(`[push-notify] removed expired subscription for ${ref}`)
        } else {
          console.error(`[push-notify] send failed: ${status} for ${ref}`)
        }
      } catch (err) {
        console.error(`[push-notify] send error for ${ref}:`, err)
      }
    }

    await markNotification(env, notif.id, anySuccess ? 'sent' : 'failed')
  }

  console.log(`[push-notify] done: processed ${notifications.length} notifications`)
}

// ── エントリーポイント ─────────────────────────────────────────────────────────

const handler = {
  async scheduled(_: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runPushNotify(env))
  },
  async fetch(_: Request, env: Env): Promise<Response> {
    await runPushNotify(env)
    return new Response('ok')
  },
}

export default handler
