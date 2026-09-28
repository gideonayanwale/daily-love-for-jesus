import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DatabaseService } from '../../database/database.service';
import { createClient } from '@supabase/supabase-js';
import * as cookie from 'cookie';
import * as schema from '@db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private supabaseAdmin: any;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly dbService: DatabaseService,
  ) {
    const url = this.configService.get<string>('supabase.url');
    const key =
      this.configService.get<string>('supabase.serviceRoleKey') ||
      this.configService.get<string>('supabase.anonKey');

    if (url && key) {
      this.supabaseAdmin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    try {
      if (!this.supabaseAdmin) {
        if (isPublic) return true;
        // In local dev without Supabase configured, create a mock user
        request.user = {
          id: 'dev-user-00000000-0000-0000-0000-000000000000',
          email: 'dev@dailyloveforjesus.org',
          name: 'Developer Mode',
          role: 'admin',
        };
        return true;
      }

      const { data: { user: authUser }, error } = await this.supabaseAdmin.auth.getUser(token);
      if (error || !authUser) {
        if (isPublic) return true;
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      // Upsert/find user in database
      const db = this.dbService.getDb();
      const adminUserId = this.configService.get<string>('security.adminUserId');
      const adminEmail = this.configService.get<string>('security.adminEmail');

      const isAdmin =
        (adminUserId && authUser.id === adminUserId) ||
        (adminEmail && authUser.email?.toLowerCase() === adminEmail.toLowerCase());

      const userRole = isAdmin ? 'admin' : 'user';

      const existingUsers = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, authUser.id))
        .limit(1);

      let appUser = existingUsers[0];

      if (!appUser) {
        const insertData = {
          id: authUser.id,
          email: authUser.email ?? null,
          name:
            authUser.user_metadata?.full_name ??
            authUser.user_metadata?.name ??
            authUser.email?.split('@')[0] ??
            'Believer',
          avatar: authUser.user_metadata?.avatar_url ?? null,
          role: userRole,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignInAt: new Date(),
        };

        const inserted = await db
          .insert(schema.users)
          .values(insertData)
          .onConflictDoUpdate({
            target: schema.users.id,
            set: {
              lastSignInAt: new Date(),
              updatedAt: new Date(),
              role: userRole,
            },
          })
          .returning();
        appUser = inserted[0] ?? insertData;
      }

      request.user = appUser;
      return true;
    } catch (err: any) {
      if (isPublic) return true;
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`SupabaseAuthGuard error: ${err.message}`);
      throw new UnauthorizedException('Authentication verification failed');
    }
  }

  private extractToken(request: any): string | undefined {
    // 1. Authorization header: Bearer <token>
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.substring(7).trim();
    }

    // 2. Cookie extraction
    const rawCookies = request.headers['cookie'];
    if (rawCookies && typeof rawCookies === 'string') {
      const parsed = cookie.parse(rawCookies);
      return parsed['sb-access-token'] || parsed['daily_love_token'];
    }

    return undefined;
  }
}
