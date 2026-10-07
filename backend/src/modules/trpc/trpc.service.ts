import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../auth/auth.service';
import { BibleService } from '../bible/bible.service';
import { HymnsService } from '../hymns/hymns.service';
import { DevotionalsService } from '../devotionals/devotionals.service';
import { TelegramService } from '../telegram/telegram.service';
import { FavoritesService } from '../favorites/favorites.service';
import { CommunityService } from '../community/community.service';
import { buildAppRouter, AppRouter, TrpcContext } from './trpc.router';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createClient } from '@supabase/supabase-js';
import * as cookie from 'cookie';
import * as schema from '@db/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

@Injectable()
export class TrpcService {
  private readonly logger = new Logger(TrpcService.name);
  public appRouter: AppRouter;
  private supabaseAdmin: any;

  constructor(
    @Optional() @Inject(ConfigService) private configService: ConfigService,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(BibleService) private readonly bibleService: BibleService,
    @Inject(HymnsService) private readonly hymnsService: HymnsService,
    @Inject(DevotionalsService) private readonly devotionalsService: DevotionalsService,
    @Inject(TelegramService) private readonly telegramService: TelegramService,
    @Inject(FavoritesService) private readonly favoritesService: FavoritesService,
    @Inject(CommunityService) private readonly communityService: CommunityService,
  ) {
    if (!this.configService) {
      this.configService = new ConfigService();
    }

    this.appRouter = buildAppRouter(
      this.authService,
      this.bibleService,
      this.hymnsService,
      this.devotionalsService,
      this.telegramService,
      this.favoritesService,
      this.communityService,
    );

    const url =
      this.configService?.get<string>('supabase.url') ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;
    const key =
      this.configService?.get<string>('supabase.serviceRoleKey') ||
      this.configService?.get<string>('supabase.anonKey') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabaseAdmin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  async createContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
    let token: string | undefined;

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token && req.headers['cookie']) {
      const cookies = cookie.parse(req.headers['cookie']);
      token = cookies['sb-access-token'] || cookies['daily_love_token'];
    }

    let user: any = undefined;

    if (token && this.supabaseAdmin) {
      try {
        const { data: { user: authUser } } = await this.supabaseAdmin.auth.getUser(token);
        if (authUser) {
          const db = this.dbService.getDb();
          const rows = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, authUser.id))
            .limit(1);

          user = rows[0];
          if (!user) {
            const adminUserId =
              this.configService?.get<string>('security.adminUserId') ||
              process.env.ADMIN_USER_ID;
            const adminEmail =
              this.configService?.get<string>('security.adminEmail') ||
              process.env.ADMIN_EMAIL;
            const isAdmin =
              (adminUserId && authUser.id === adminUserId) ||
              (adminEmail && authUser.email?.toLowerCase() === adminEmail.toLowerCase());

            const inserted = await db
              .insert(schema.users)
              .values({
                id: authUser.id,
                email: authUser.email ?? null,
                name:
                  authUser.user_metadata?.full_name ??
                  authUser.user_metadata?.name ??
                  'User',
                avatar: authUser.user_metadata?.avatar_url ?? null,
                role: isAdmin ? 'admin' : 'user',
              })
              .returning();
            user = inserted[0];
          }
        }
      } catch (err: any) {
        this.logger.warn(`tRPC auth error: ${err.message}`);
      }
    } else if (!this.supabaseAdmin) {
      // Dev mode fallback
      user = {
        id: 'dev-user-00000000-0000-0000-0000-000000000000',
        email: 'dev@dailyloveforjesus.org',
        name: 'Developer Mode',
        role: 'admin',
      };
    }

    return { req, res, user };
  }

  getExpressMiddleware() {
    return trpcExpress.createExpressMiddleware({
      router: this.appRouter,
      createContext: (opts) => this.createContext(opts),
    });
  }
}
