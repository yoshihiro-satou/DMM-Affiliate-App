import 'server-only'

/**
 * Telegram Bot API の薄いクライアント（追加11）。
 * セール速報アダプタ（sale-broadcast.ts）とチャンネル運用ルート（/api/telegram/setup）で共有する。
 *
 * トークンは Cloudflare secret（TELEGRAM_BOT_TOKEN）としてサーバーにのみ保持し、
 * クライアントへは絶対に渡さない。
 */

export const TELEGRAM_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export type TelegramConfig = { token: string; chatId: string }

/** env が揃っていれば設定を返す。未設定なら null（呼び出し側で no-op 判定）。 */
export function getTelegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHANNEL_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

/** HTML parse_mode 用のエスケープ（& < > のみ。Telegram の仕様に準拠）。 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; reason: string }

/** チャンネルへ1メッセージ投稿し、message_id を返す。 */
export async function telegramSendMessage(
  cfg: TelegramConfig,
  text: string,
  opts?: { disablePreview?: boolean }
): Promise<TelegramSendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: opts?.disablePreview ?? false,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, reason: `telegram sendMessage ${res.status}: ${body.slice(0, 200)}` }
    }
    const json = (await res.json()) as { result?: { message_id?: number } }
    const messageId = json.result?.message_id
    if (typeof messageId !== 'number') {
      return { ok: false, reason: 'telegram sendMessage: no message_id in response' }
    }
    return { ok: true, messageId }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'error' }
  }
}

/** 指定メッセージをチャンネルにピン留めする（Bot がチャンネル管理者である必要あり）。 */
export async function telegramPinMessage(
  cfg: TelegramConfig,
  messageId: number,
  opts?: { disableNotification?: boolean }
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.token}/pinChatMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        message_id: messageId,
        disable_notification: opts?.disableNotification ?? true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, reason: `telegram pinChatMessage ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'error' }
  }
}
