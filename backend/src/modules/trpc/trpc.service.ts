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
import { createHmac } from 'node:crypto';

const anonymousVisitCache = new Map<string, number>();

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
      this.dbService,
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
    let authError = false;
    const credentialSupplied = Boolean(token);

    if (credentialSupplied && !this.supabaseAdmin) {
      authError = true;
    }

    if (token && this.supabaseAdmin) {
      try {
        const { data: { user: authUser }, error } = await this.supabaseAdmin.auth.getUser(token);
        if (error || !authUser?.id) {
          authError = true;
        }
        if (authUser?.id && !error) {
          const db = this.dbService.getDb();
          const rows = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, authUser.id))
            .limit(1);

          user = rows[0];
          if (!user) {
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
                role: 'user',
              })
              .onConflictDoNothing({ target: schema.users.id })
              .returning();
            user = inserted[0];
            if (!user) {
              const concurrentProfile = await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, authUser.id))
                .limit(1);
              user = concurrentProfile[0];
            }
          }
        }
      } catch (err: any) {
        authError = true;
        this.logger.warn(`tRPC auth error: ${err.message}`);
      }
    }

    if (!user && req.method === 'GET') {
      this.trackAnonymousVisit(req);
    }

    return { req, res, user, authError };
  }

  private trackAnonymousVisit(req: Request): void {
    const rawClientPath = req.headers['x-client-path'];
    const candidate = typeof rawClientPath === 'string' ? rawClientPath.split('?')[0] : '';
    const pagePath = /^\/[a-zA-Z0-9/_-]{0,99}$/.test(candidate) ? candidate : '';
    if (!pagePath || pagePath.startsWith('/api/') || pagePath.startsWith('/assets/')) return;

    const ip = req.ip || req.socket.remoteAddress;
    if (!ip) return;

    const now = Date.now();
    const cacheKey = `${ip}:${pagePath}`;
    const lastLogged = anonymousVisitCache.get(cacheKey) ?? 0;
    if (now - lastLogged < 60_000) return;
    anonymousVisitCache.set(cacheKey, now);
    if (anonymousVisitCache.size > 5000) {
      for (const [key, timestamp] of anonymousVisitCache) {
        if (now - timestamp > 60_000) anonymousVisitCache.delete(key);
      }
    }

    const appSecret = this.configService?.get<string>('security.appSecret');
    const visitorHash = appSecret
      ? createHmac('sha256', appSecret).update(ip).digest('hex').slice(0, 40)
      : null;
    const userAgent = req.headers['user-agent']?.slice(0, 512) ?? null;

    void this.dbService.getDb()
      .insert(schema.auditLogs)
      .values({
        action: 'anonymous_visit',
        resourceType: 'page',
        resourceId: pagePath,
        actorId: null,
        ipAddress: visitorHash,
        userAgent,
        metadata: { method: 'GET', timestamp: new Date(now).toISOString() },
      })
      .catch((error: unknown) => {
        this.logger.warn(`Anonymous visitor tracking failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
  }

  getExpressMiddleware() {
    return trpcExpress.createExpressMiddleware({
      router: this.appRouter,
      createContext: (opts) => this.createContext(opts),
    });
  }
}
