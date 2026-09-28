import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BibleModule } from './modules/bible/bible.module';
import { HymnsModule } from './modules/hymns/hymns.module';
import { DevotionalsModule } from './modules/devotionals/devotionals.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { CommunityModule } from './modules/community/community.module';
import { SyncModule } from './modules/sync/sync.module';
import { TrpcModule } from './modules/trpc/trpc.module';
import { TrpcService } from './modules/trpc/trpc.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../app/.env'],
    }),
    DatabaseModule,
    AuthModule,
    BibleModule,
    HymnsModule,
    DevotionalsModule,
    TelegramModule,
    FavoritesModule,
    CommunityModule,
    SyncModule,
    TrpcModule,
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly trpcService: TrpcService) {}

  configure(consumer: MiddlewareConsumer) {
    // Mount tRPC at /api/trpc
    consumer.apply(this.trpcService.getExpressMiddleware()).forRoutes('api/trpc');
  }
}
