import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, sql } from 'drizzle-orm';

export interface SyncResult {
  tableName: string;
  direction: string;
  rowsSynced: number;
  durationMs: number;
  errors: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly dbService: DatabaseService) {}

  async checkHealth() {
    return this.dbService.checkHealth();
  }

  async runSync(direction: string = 'all'): Promise<SyncResult[]> {
    const neonDb = this.dbService.getNeonDb();
    const supabaseDb = this.dbService.getSupabaseDb();

    if (!neonDb || !supabaseDb) {
      return [
        {
          tableName: 'all',
          direction,
          rowsSynced: 0,
          durationMs: 0,
          errors: ['Both databases must be configured and connected to perform sync'],
        },
      ];
    }

    const results: SyncResult[] = [];
    const tables = [
      { name: 'users', table: schema.users, conflictCol: schema.users.id },
      { name: 'devotionals', table: schema.devotionals, conflictCol: schema.devotionals.id },
      { name: 'communities', table: schema.communities, conflictCol: schema.communities.id },
      { name: 'bible_books', table: schema.bibleBooks, conflictCol: schema.bibleBooks.id },
      { name: 'hymns', table: schema.hymns, conflictCol: schema.hymns.id },
    ];

    for (const t of tables) {
      const start = Date.now();
      let rowsSynced = 0;
      const errors: string[] = [];

      try {
        if (direction === 'all' || direction === 'supabase→neon') {
          const sourceRows = await supabaseDb.select().from(t.table).limit(500);
          if (sourceRows.length > 0) {
            for (const row of sourceRows) {
              await neonDb
                .insert(t.table)
                .values(row)
                .onConflictDoUpdate({
                  target: t.conflictCol,
                  set: { ...row },
                });
              rowsSynced++;
            }
          }
        }

        if (direction === 'all' || direction === 'neon→supabase') {
          const sourceRows = await neonDb.select().from(t.table).limit(500);
          if (sourceRows.length > 0) {
            for (const row of sourceRows) {
              await supabaseDb
                .insert(t.table)
                .values(row)
                .onConflictDoUpdate({
                  target: t.conflictCol,
                  set: { ...row },
                });
              rowsSynced++;
            }
          }
        }
      } catch (err: any) {
        errors.push(`Sync failed for ${t.name}: ${err.message}`);
        this.logger.error(`Sync error on table ${t.name}: ${err.message}`);
      }

      results.push({
        tableName: t.name,
        direction,
        rowsSynced,
        durationMs: Date.now() - start,
        errors,
      });
    }

    return results;
  }
}
