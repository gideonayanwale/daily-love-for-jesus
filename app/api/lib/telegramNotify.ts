import { env } from './env';
import { Devotional } from '@db/schema';
import { format } from 'date-fns';

// Escapes characters that are special in Telegram's HTML parse mode.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Formats a devotional as an HTML Telegram message.
// Only sections with content are included.
export async function sendDevotionalToTelegram(devotional: Devotional): Promise<boolean> {
  if (!env.telegramBotToken?.trim() || !env.telegramChannelId?.trim()) return false;

  const lines: string[] = [];

  const dateStr = devotional.devotionalDate
    ? format(new Date(devotional.devotionalDate), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');
  lines.push(`\uD83D\uDCC5 <b>${dateStr}</b>`);

  if (devotional.topic) {
    lines.push('');
    lines.push(`<b>TOPIC: ${escHtml(devotional.topic)}</b>`);
  }

  if (devotional.declarationOfFaith) {
    lines.push('');
    lines.push(`<b>DECLARATION OF FAITH:</b>`);
    lines.push(`<i>${escHtml(devotional.declarationOfFaith)}</i>`);
  }

  if (devotional.scripture) {
    lines.push('');
    lines.push(`\uD83D\uDCD6 <b>${escHtml(devotional.scripture)}</b>`);
    if (devotional.scriptureText) {
      lines.push(`<i>${escHtml(devotional.scriptureText)}</i>`);
    }
  }

  if (devotional.body) {
    lines.push('');
    lines.push(escHtml(devotional.body));
  }

  if (devotional.prayer) {
    lines.push('');
    lines.push(`\uD83D\uDE4F <b>PRAYER:</b>`);
    lines.push(`<i>${escHtml(devotional.prayer)}</i>`);
  }

  if (devotional.dailyCapsule) {
    lines.push('');
    lines.push(`\uD83D\uDC8A <b>DAILY CAPSULE:</b>`);
    lines.push(escHtml(devotional.dailyCapsule));
  }

  if (devotional.brothersKeeper) {
    lines.push('');
    lines.push(`\uD83E\uDD1D <b>BE YOUR BROTHER'S KEEPER:</b>`);
    lines.push(escHtml(devotional.brothersKeeper));
  }

  if (devotional.dailyBibleReading) {
    lines.push('');
    lines.push(`\uD83D\uDCDA <b>DAILY BIBLE READING:</b>`);
    lines.push(escHtml(devotional.dailyBibleReading));
  }

  if (devotional.otherInfo) {
    lines.push('');
    lines.push(`\u2139\uFE0F ${escHtml(devotional.otherInfo)}`);
  }

  const text = lines.join('\n');

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.telegramChannelId,
          text,
          parse_mode: 'HTML',
        }),
      }
    );
    const result = await res.json().catch(() => null) as { ok?: boolean; description?: string } | null;
    if (!res.ok || result?.ok !== true) {
      throw new Error(result?.description || `Telegram sendMessage failed with status ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error('[telegramNotify] fetch error:', err);
    throw err;
  }
}
