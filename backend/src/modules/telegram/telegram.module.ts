import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, SupabaseAuthGuard, RolesGuard],
  exports: [TelegramService],
})
export class TelegramModule {}
