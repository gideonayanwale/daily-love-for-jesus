import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ChatArchiveService } from './archive.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, ChatArchiveService],
  exports: [CommunityService, ChatArchiveService],
})
export class CommunityModule {}
