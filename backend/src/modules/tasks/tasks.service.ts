import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DevotionalsService } from '../devotionals/devotionals.service';
import { TelegramService } from '../telegram/telegram.service';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly devotionalsService: DevotionalsService,
    private readonly telegramService: TelegramService,
    private readonly syncService: SyncService,
  ) {}

  onModuleInit() {
    this.logger.log('⏱️ Background task schedulers active (Devotional drops, Telegram ingest, DB health)');

    // 1. Initial warm-up check 10 seconds after server start
    const warmupTimer = setTimeout(() => {
      this.checkTodayDevotional();
      this.checkDatabaseHealth();
    }, 10000);
    this.timers.push(warmupTimer);

    // 2. Periodic Telegram channel ingest check every 15 minutes
    const telegramInterval = setInterval(() => {
      this.processTelegramQueue();
    }, 15 * 60 * 1000);
    this.timers.push(telegramInterval);

    // 3. Daily morning devotional check aligned to 05:00 UTC
    this.scheduleDailyAtUtcHour(5, () => {
      this.checkTodayDevotional();
    });

    // 4. Nightly database health check aligned to 02:00 UTC
    this.scheduleDailyAtUtcHour(2, () => {
      this.checkDatabaseHealth();
    });
  }

  onModuleDestroy() {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
  }

  async checkTodayDevotional() {
    this.logger.log('🌅 [Task] Checking today\'s morning devotional...');
    try {
      const today = await this.devotionalsService.getToday();
      if (today) {
        this.logger.log(`✅ [Task] Today's devotional confirmed: "${today.title}" (${today.scripture || 'General'})`);
      } else {
        this.logger.warn('⚠️ [Task] No devotional specifically assigned for today. Fallback active.');
      }
    } catch (err: any) {
      this.logger.error(`❌ [Task] Devotional check error: ${err.message}`);
    }
  }

  async processTelegramQueue() {
    try {
      const result = await this.telegramService.listMessages(20, 0, false);
      if (result && result.items && result.items.length > 0) {
        this.logger.log(`📥 [Task] Found ${result.items.length} unhandled Telegram message(s). Processing...`);
        for (const msg of result.items) {
          await this.telegramService.processMessage(msg.id);
        }
      }
    } catch (err: any) {
      // Quiet fail if not configured
    }
  }

  async checkDatabaseHealth() {
    try {
      const health = await this.syncService.checkHealth();
      this.logger.log(
        `📊 [Task] DB Health: Neon [${health.neon?.connected ? 'CONNECTED' : 'STANDBY'}], Supabase [${health.supabase?.connected ? 'CONNECTED' : 'STANDBY'}]`
      );
    } catch (err: any) {
      this.logger.warn(`⚠️ [Task] Database health check: ${err.message}`);
    }
  }

  private scheduleDailyAtUtcHour(targetUtcHour: number, callback: () => void) {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(targetUtcHour, 0, 0, 0);

    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    const delayMs = next.getTime() - now.getTime();
    this.logger.log(
      `⏰ [Scheduler] Next execution for ${targetUtcHour.toString().padStart(2, '0')}:00 UTC scheduled in ${Math.round(delayMs / 60000)} minutes`
    );

    const firstTimer = setTimeout(() => {
      callback();
      // Repeat every 24 hours
      const recurring = setInterval(callback, 24 * 60 * 60 * 1000);
      this.timers.push(recurring);
    }, delayMs);

    this.timers.push(firstTimer);
  }
}
