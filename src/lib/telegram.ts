/**
 * Mock Telegram notification utility.
 * Replace body of `sendTelegramAlert` with a real fetch to the
 * Telegram Bot API when the bot token is available:
 *
 *   POST https://api.telegram.org/bot<TOKEN>/sendMessage
 *   body: { chat_id, text }
 */

export type TelegramAlertEvent =
  | 'quality_flag'
  | 'low_inventory'
  | 'milestone_reached'
  | 'new_log'
  | 'recognition'
  | 'supplier_added'
  | 'email_alert';

const EMOJI: Record<TelegramAlertEvent, string> = {
  quality_flag:      '⚠️',
  low_inventory:     '📦',
  milestone_reached: '🏆',
  new_log:           '📝',
  recognition:       '🌟',
  supplier_added:    '🤝',
  email_alert:       '📧',
};

/**
 * Mock Email notification utility.
 */
export async function sendEmailNotification(subject: string, body: string): Promise<void> {
  const text = `📧 *MajiSafi EMAIL DISPATCH*\nSubject: ${subject}\n\n${body}`;
  console.log(`[EmailMock] ${text}`);
}

export async function sendTelegramAlert(event: TelegramAlertEvent, message: string): Promise<void> {

  const text = `${EMOJI[event]} *MajiSafi OS*\n${message}`;

  // ── Real implementation (uncomment when bot is ready) ─────────────────
  // const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  // const CHAT_ID   = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
  // if (!BOT_TOKEN || !CHAT_ID) return;
  // await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
  // });
  // ── ────────────────────────────────────────────────────────────────────

  // Mock: log to console so it's visible during development
  console.log(`[TelegramMock] ${text}`);
}
