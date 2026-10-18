import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ChatArchiveService } from './archive.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [CommunityController],
  providers: [CommunityService, ChatArchiveService],
  exports: [CommunityService, ChatArchiveService],
})
export class CommunityModule {}
