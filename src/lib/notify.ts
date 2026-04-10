import { supabase } from './supabase';

/**
 * Notify a department about a Pulse mention.
 * 1. Writes to transparency_feed (always)
 * 2. Sends Telegram message if bot credentials exist (optional)
 */
export async function notifyDepartment(
  departmentSlug: string,
  message: string,
  postId: number
) {
  // 1. Always write to transparency_feed
  await supabase.from('transparency_feed').insert({
    event_type: 'pulse_mention',
    department_from: 'pulse',
    department_to: departmentSlug,
    message: message.slice(0, 100),
    severity: 'info',
  });

  // 2. Try Telegram if bot token and chat id exist
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📣 Pulse mention for ${departmentSlug}:\n${message.slice(0, 100)}\n\nView: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/pulse`,
        }),
      });
    } catch {
      // Telegram is optional — do not crash
    }
  }
}
