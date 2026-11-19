import { env } from './env';
import type { Devotional } from '@db/schema';
import { format } from 'date-fns';

function chunkTelegramText(value: string, maxLength = 3800): string[] {
  const chunks: string[] = [];
  let offset = 0;

  while (offset < value.length) {
    let end = Math.min(offset + maxLength, value.length);
    if (end < value.length) {
      const newline = value.lastIndexOf('\n', end);
      if (newline > offset + Math.floor(maxLength * 0.6)) {
        end = newline;
      }
      // Avoid cutting a UTF-16 surrogate pair at the chunk boundary.
      const lastCodeUnit = value.charCodeAt(end - 1);
      if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) end -= 1;
    }

    const chunk = value.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    offset = end;
  }

  return chunks;
}

// Sends a published devotional to the configured Telegram channel.
// Plain text is used to avoid HTML injection and malformed markup from imported content.
export async function sendDevotionalToTelegram(devotional: Devotional): Promise<boolean> {
  if (!env.telegramBotToken?.trim() || !env.telegramChannelId?.trim()) return false;

  const dateStr = devotional.devotionalDate
    ? format(new Date(devotional.devotionalDate), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');
  const sections = [
    `📅 ${dateStr}`,
    devotional.title ? devotional.title : '',
    devotional.topic ? `TOPIC: ${devotional.topic}` : '',
    devotional.declarationOfFaith ? `DECLARATION OF FAITH:\n${devotional.declarationOfFaith}` : '',
    devotional.scripture
      ? `📖 ${devotional.scripture}${devotional.scriptureText ? `\n${devotional.scriptureText}` : ''}`
      : '',
    devotional.body ?? '',
    devotional.reflection ? `REFLECTION:\n${devotional.reflection}` : '',
    devotional.prayer ? `🙏 PRAYER:\n${devotional.prayer}` : '',
    devotional.dailyCapsule ? `DAILY CAPSULE:\n${devotional.dailyCapsule}` : '',
    devotional.brothersKeeper ? `🤝 BE YOUR BROTHER'S KEEPER:\n${devotional.brothersKeeper}` : '',
    devotional.dailyBibleReading ? `📚 DAILY BIBLE READING:\n${devotional.dailyBibleReading}` : '',
    devotional.otherInfo ? `ℹ️ ${devotional.otherInfo}` : '',
  ].filter(Boolean);

  const chunks = chunkTelegramText(sections.join('\n\n'));
  if (chunks.length === 0) return false;

  for (const text of chunks) {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.telegramChannelId,
          text,
          disable_web_page_preview: true,
        }),
      },
    );

    const result = await response.json().catch(() => null) as
      | { ok?: boolean; description?: string }
      | null;
    if (!response.ok || result?.ok !== true) {
      throw new Error(result?.description || `Telegram sendMessage failed with status ${response.status}`);
    }
  }

  return true;
}
