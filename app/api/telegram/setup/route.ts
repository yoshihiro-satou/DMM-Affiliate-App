import {
  TELEGRAM_SITE_URL,
  getTelegramConfig,
  telegramPinMessage,
  telegramSendMessage,
} from '@/lib/broadcast/telegram'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * Telegram チャンネル運用の整備（追加11）。
 * 「固定の紹介ポスト」を投稿し、チャンネルにピン留めする一回限りの管理操作。
 *
 * トークンはサーバーの secret（TELEGRAM_BOT_TOKEN）のみを使い、クライアントへは出さない。
 * 認証は REVALIDATE_SECRET（ヘッダ x-revalidate-secret もしくは ?secret=）。
 *   例: GET /api/telegram/setup?secret=<REVALIDATE_SECRET>
 *       GET /api/telegram/setup?secret=...&dry=1   （投稿せず本文だけ確認）
 */

/** ピン留めする固定の紹介ポスト本文（HTML parse_mode）。 */
function buildIntroMessage(): string {
  const siteLink = `${TELEGRAM_SITE_URL}/?ref=telegram_pin`
  return [
    '🔥 <b>FANZAピックス セール速報</b> へようこそ',
    '',
    '毎日、FANZAの「本日限り」の高割引セールを自動でお届けします。',
    '・割引率TOPの作品をピックアップ',
    '・同人90%OFFクーポン情報も随時',
    '・気になったらワンタップでサイトへ',
    '',
    '🌐 <b>サイト本体</b>（お気に入り保存・値下げ通知・スワイプ診断）',
    `👉 <a href="${siteLink}">fanzapicks.com</a>`,
    '',
    '<i>※PR（広告）｜18歳未満閲覧禁止</i>',
  ].join('\n')
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) return false
  const header = request.headers.get('x-revalidate-secret')
  const query = request.nextUrl.searchParams.get('secret')
  return header === expected || query === expected
}

async function handle(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = getTelegramConfig()
  if (!cfg) {
    return Response.json(
      { ok: false, reason: 'not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID 未設定)' },
      { status: 400 }
    )
  }

  const text = buildIntroMessage()
  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  if (dryRun) {
    return Response.json({ ok: true, dryRun: true, text })
  }

  const sent = await telegramSendMessage(cfg, text, { disablePreview: true })
  if (!sent.ok) {
    return Response.json({ ok: false, step: 'send', reason: sent.reason }, { status: 502 })
  }

  const pinned = await telegramPinMessage(cfg, sent.messageId)
  return Response.json({
    ok: true,
    messageId: sent.messageId,
    pinned: pinned.ok,
    pinReason: pinned.ok ? undefined : pinned.reason,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
