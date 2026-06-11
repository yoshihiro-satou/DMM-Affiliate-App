/**
 * Telegram「セール速報チャンネル」への送客で使う公開情報（追加11）。
 * Bot トークン等の秘匿値はここに置かない（サーバーの secret のみ）。
 */
export const TELEGRAM_CHANNEL_USERNAME = 'fanzapicks_sale'
export const TELEGRAM_CHANNEL_URL = `https://t.me/${TELEGRAM_CHANNEL_USERNAME}`
/**
 * ブラウザ版（公開プレビュー）。Telegramアプリ・ログイン不要で投稿を閲覧できる。
 * アプリ未所持ユーザーの離脱を防ぐため「アプリ不要」訴求の併記リンクに使う。
 */
export const TELEGRAM_CHANNEL_WEB_URL = `https://t.me/s/${TELEGRAM_CHANNEL_USERNAME}`
