import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import * as crypto from 'crypto';

@ApiTags('Telegram')
@Controller('api/telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Telegram bot webhook receiver (Public endpoint called by Telegram servers)' })
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    const expected = this.configService.get<string>('integrations.telegramWebhookSecret') || process.env.TELEGRAM_WEBHOOK_SECRET || '';
    if (!expected) {
      throw new UnauthorizedException(
        'Telegram webhook is not configured. Set TELEGRAM_BOT_SECRET to enable webhook ingestion.',
      );
    }
    if (!secretToken || !this.timingSafeEqual(secretToken, expected)) {
      throw new UnauthorizedException('Invalid Telegram webhook secret token');
    }

    const configuredChannel = this.configService.get<string>('integrations.telegramChannelId') ||
      process.env.TELEGRAM_CHANNEL_ID || '';
    const message = update?.message ?? update?.channel_post ?? update?.channelPost;
    if (!message) return { status: 'ignored', reason: 'no_message' };
    if (!configuredChannel && process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Telegram channel is not configured');
    }
    if (configuredChannel) {
      const incomingId = String(message.chat?.id ?? '');
      const incomingUsername = message.chat?.username ? `@${message.chat.username}` : '';
      if (
        configuredChannel !== incomingId &&
        configuredChannel.toLowerCase() !== incomingUsername.toLowerCase()
      ) {
        throw new UnauthorizedException('Telegram update is not from the configured channel');
      }
    }
    return this.telegramService.handleWebhookUpdate(update);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  @Get('messages')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin', 'elevated_admin')
  @ApiOperation({ summary: 'List received Telegram messages (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'processed', required: false, type: Boolean })
  async listMessages(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('processed') processed?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 20;
    const o = offset ? parseInt(offset, 10) : 0;
    const p = processed !== undefined ? processed === 'true' : undefined;
    return this.telegramService.listMessages(l, o, p);
  }

  @Post('messages/:id/process')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger devotional extraction for a message' })
  async processMessage(@Param('id', ParseIntPipe) id: number) {
    return this.telegramService.processMessage(id);
  }
}
