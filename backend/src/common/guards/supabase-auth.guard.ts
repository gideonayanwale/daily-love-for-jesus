import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
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
  private supabaseAdmin: any = undefined;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
    @Optional() @Inject(DatabaseService) private readonly dbService?: DatabaseService,
  ) {}

  private getSupabaseAdmin() {
    if (this.supabaseAdmin !== undefined) return this.supabaseAdmin;

    const url =
      this.configService?.get<string>('supabase.url') ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      '';
    const key =
      this.configService?.get<string>('supabase.serviceRoleKey') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      this.configService?.get<string>('supabase.anonKey') ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

    if (!url || !key) {
      this.supabaseAdmin = null;
      return this.supabaseAdmin;
    }

    try {
      this.supabaseAdmin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } catch (error: any) {
      this.logger.error(`Failed to initialize Supabase auth client: ${error.message}`);
      this.supabaseAdmin = null;
    }
    return this.supabaseAdmin;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    // Public routes allow genuinely anonymous requests. A supplied but invalid
    // credential must never be silently downgraded to anonymous access.
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    try {
      const supabase = this.getSupabaseAdmin();
      if (!supabase) {
        throw new UnauthorizedException('Authentication service is not configured.');
      }

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) {
        throw new UnauthorizedException('Invalid or expired authentication token');
      }

      const db = this.dbService?.getDb();
      if (!db) {
        throw new UnauthorizedException('Application profile database is unavailable.');
      }

      const authUser = data.user;
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, authUser.id))
        .limit(1);

      let appUser = existing[0];
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
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignInAt: new Date(),
        };

        const inserted = await db
          .insert(schema.users)
          .values(insertData)
          .onConflictDoNothing({ target: schema.users.id })
          .returning();
        appUser = inserted[0] ?? (
          await db.select().from(schema.users).where(eq(schema.users.id, authUser.id)).limit(1)
        )[0];
      }

      if (!appUser) {
        throw new UnauthorizedException('User profile could not be loaded.');
      }

      // Role is read only from the server-controlled application profile.
      // Sign-in never promotes, demotes, or overwrites an existing role.
      request.user = appUser;
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`SupabaseAuthGuard verification failed: ${error.message}`);
      throw new UnauthorizedException('Authentication verification failed');
    }
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.substring(7).trim() || undefined;
    }

    const rawCookies = request.headers['cookie'];
    if (rawCookies && typeof rawCookies === 'string') {
      const parsed = cookie.parse(rawCookies);
      return parsed['sb-access-token'] || parsed['daily_love_token'] || undefined;
    }
    return undefined;
  }
}
