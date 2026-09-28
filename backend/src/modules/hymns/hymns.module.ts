import { Module } from '@nestjs/common';
import { HymnsController } from './hymns.controller';
import { HymnsService } from './hymns.service';

@Module({
  controllers: [HymnsController],
  providers: [HymnsService],
  exports: [HymnsService],
})
export class HymnsModule {}
