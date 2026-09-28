import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as schema from '@db/schema';
import * as relations from '@db/relations';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const fullSchema = { ...schema, ...relations };

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private neonClient: any = null;
  private neonDb: any = null;
  private supabaseClient: any = null;
  private supabaseDb: any = null;
  private devStubDb: any = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initNeon();
    this.initSupabase();
  }

  onModuleDestroy() {
    if (this.neonClient) {
      this.neonClient.end?.().catch(() => {});
    }
    if (this.supabaseClient) {
      this.supabaseClient.end?.().catch(() => {});
    }
  }

  private initNeon() {
    const neonUrl = this.configService.get<string>('database.neonDatabaseUrl');
    if (!neonUrl) {
      this.logger.warn('NEON_DATABASE_URL not configured');
      return;
    }

    try {
      this.neonClient = postgres(neonUrl, {
        ssl: 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      this.neonDb = drizzle(this.neonClient, { schema: fullSchema });
      this.logger.log('✅ Neon serverless DB initialized via postgres.js');
    } catch (err: any) {
      this.logger.error(`Neon connection error: ${err.message}`);
    }
  }

  private initSupabase() {
    const dbUrl = this.configService.get<string>('database.databaseUrl');
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL not configured');
      return;
    }

    try {
      const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com');
      this.supabaseClient = postgres(dbUrl, {
        prepare: false, // Required for Supabase transaction pooler (pgbouncer)
        ssl: isSupabase ? 'require' : undefined,
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      this.supabaseDb = drizzle(this.supabaseClient, { schema: fullSchema });
      this.logger.log('✅ Supabase PostgreSQL DB initialized');
    } catch (err: any) {
      this.logger.error(`Supabase connection error: ${err.message}`);
    }
  }

  getDb(): any {
    if (this.neonDb) return this.neonDb;
    if (this.supabaseDb) return this.supabaseDb;
    if (!this.devStubDb) {
      this.logger.warn('⚠️ No database connected — using dev stub proxy');
      this.devStubDb = this.createDevStub();
    }
    return this.devStubDb;
  }

  getNeonDb(): any {
    return this.neonDb;
  }

  getSupabaseDb(): any {
    return this.supabaseDb;
  }

  async checkHealth(): Promise<{
    neon: { connected: boolean; latencyMs?: number; error?: string };
    supabase: { connected: boolean; latencyMs?: number; error?: string };
  }> {
    const result = {
      neon: { connected: false } as { connected: boolean; latencyMs?: number; error?: string },
      supabase: { connected: false } as { connected: boolean; latencyMs?: number; error?: string },
    };

    if (this.neonClient) {
      try {
        const start = Date.now();
        await this.neonClient`SELECT 1`;
        result.neon = { connected: true, latencyMs: Date.now() - start };
      } catch (err: any) {
        result.neon = { connected: false, error: err.message };
      }
    } else {
      result.neon = { connected: false, error: 'Not configured' };
    }

    if (this.supabaseClient) {
      try {
        const start = Date.now();
        await this.supabaseClient`SELECT 1`;
        result.supabase = { connected: true, latencyMs: Date.now() - start };
      } catch (err: any) {
        result.supabase = { connected: false, error: err.message };
      }
    } else {
      result.supabase = { connected: false, error: 'Not configured' };
    }

    return result;
  }

  private createDevStub(): any {
    const chainable = () => {
      const handler: any = {
        get(_target: any, prop: string) {
          if (prop === 'then') {
            return (resolve: any) => resolve([]);
          }
          if (prop === 'catch') {
            return () => Promise.resolve([]);
          }
          return (..._args: any[]) => new Proxy(() => {}, handler);
        },
        apply() {
          return new Proxy(() => {}, handler);
        },
      };
      return new Proxy(() => {}, handler);
    };

    return new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'query') {
            return new Proxy({}, { get: () => () => Promise.resolve([]) });
          }
          return chainable();
        },
      },
    );
  }
}
