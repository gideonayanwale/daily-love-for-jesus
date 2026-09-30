import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DevotionalsModule } from '../devotionals/devotionals.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [DevotionalsModule, TelegramModule, SyncModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
