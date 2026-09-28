import { Module } from '@nestjs/common';
import { DevotionalsController } from './devotionals.controller';
import { DevotionalsService } from './devotionals.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [DevotionalsController],
  providers: [DevotionalsService, SupabaseAuthGuard, RolesGuard],
  exports: [DevotionalsService],
})
export class DevotionalsModule {}
