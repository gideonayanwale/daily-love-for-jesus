import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Roles, RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Telegram')
@Controller('api/telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Telegram bot webhook receiver (Public endpoint called by Telegram servers)' })
  async handleWebhook(@Body() update: any) {
    return this.telegramService.handleWebhookUpdate(update);
  }

  @Get('messages')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
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
