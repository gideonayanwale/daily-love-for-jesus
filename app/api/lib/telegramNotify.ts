import { env } from './env';
import { Devotional } from '@db/schema';
import { format } from 'date-fns';

// Formats a devotional as an HTML Telegram message.
// Only sections with content are included.
export async function sendDevotionalToTelegram(devotional: Devotional): Promise<void> {
  if (!env.telegramBotToken || !env.telegramChannelId) return;

  const lines: string[] = [];

  const dateStr = devotional.devotionalDate
    ? format(new Date(devotional.devotionalDate), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');
  lines.push(`\uD83D\uDCC5 <b>${dateStr}</b>`);

  if (devotional.topic) {
    lines.push('');
    lines.push(`<b>TOPIC: ${devotional.topic}</b>`);
  }

  if (devotional.declarationOfFaith) {
    lines.push('');
    lines.push(`<b>DECLARATION OF FAITH:</b>`);
    lines.push(`<i>${devotional.declarationOfFaith}</i>`);
  }

  if (devotional.scripture) {
    lines.push('');
    lines.push(`\uD83D\uDCD6 <b>${devotional.scripture}</b>`);
    if (devotional.scriptureText) {
      lines.push(`<i>${devotional.scriptureText}</i>`);
    }
  }

  if (devotional.body) {
    lines.push('');
    lines.push(devotional.body);
  }

  if (devotional.prayer) {
    lines.push('');
    lines.push(`\uD83D\uDE4F <b>PRAYER:</b>`);
    lines.push(`<i>${devotional.prayer}</i>`);
  }

  if (devotional.dailyCapsule) {
    lines.push('');
    lines.push(`\uD83D\uDC8A <b>DAILY CAPSULE:</b>`);
    lines.push(devotional.dailyCapsule);
  }

  if (devotional.brothersKeeper) {
    lines.push('');
    lines.push(`\uD83E\uDD1D <b>BE YOUR BROTHER'S KEEPER:</b>`);
    lines.push(devotional.brothersKeeper);
  }

  if (devotional.dailyBibleReading) {
    lines.push('');
    lines.push(`\uD83D\uDCDA <b>DAILY BIBLE READING:</b>`);
    lines.push(devotional.dailyBibleReading);
  }

  if (devotional.otherInfo) {
    lines.push('');
    lines.push(`\u2139\uFE0F ${devotional.otherInfo}`);
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
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegramNotify] sendMessage failed:', res.status, body);
    }
  } catch (err) {
    console.error('[telegramNotify] fetch error:', err);
  }
}
