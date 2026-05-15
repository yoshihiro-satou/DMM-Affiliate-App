/**
 * VAPIDキーペアを生成して .env.local 用に出力するスクリプト
 * 使用方法: node scripts/generate-vapid-keys.mjs
 */
import { webcrypto } from 'crypto'
const { subtle } = webcrypto

const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])

const privJwk = await subtle.exportKey('jwk', pair.privateKey)
const pubRaw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey))
const pubB64 = Buffer.from(pubRaw).toString('base64url')

console.log('# .env.local に追加してください:')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${pubB64}`)
console.log()
console.log('# Workers Cloudflare にシークレットとして登録してください:')
console.log('# wrangler secret put VAPID_PUBLIC_KEY    --name dmm-push-notify')
console.log(`# 値: ${pubB64}`)
console.log()
console.log('# wrangler secret put VAPID_PRIVATE_KEY_JWK --name dmm-push-notify')
console.log(`# 値: ${JSON.stringify(privJwk)}`)
