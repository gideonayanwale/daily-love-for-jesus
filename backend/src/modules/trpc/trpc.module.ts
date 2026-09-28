import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { AuthModule } from '../auth/auth.module';
import { BibleModule } from '../bible/bible.module';
import { HymnsModule } from '../hymns/hymns.module';
import { DevotionalsModule } from '../devotionals/devotionals.module';
import { TelegramModule } from '../telegram/telegram.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [
    AuthModule,
    BibleModule,
    HymnsModule,
    DevotionalsModule,
    TelegramModule,
    FavoritesModule,
    CommunityModule,
  ],
  providers: [TrpcService],
  exports: [TrpcService],
})
export class TrpcModule {}
