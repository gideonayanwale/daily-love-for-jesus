import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, like, or, sql } from 'drizzle-orm';

@Injectable()
export class HymnsService {
  constructor(private readonly dbService: DatabaseService) {}

  private normalizeHymn<T extends { stanzas: unknown }>(hymn: T) {
    let stanzas: Array<{ number?: number; text?: string }> = [];
    if (Array.isArray(hymn.stanzas)) {
      stanzas = hymn.stanzas as Array<{ number?: number; text?: string }>;
    } else if (typeof hymn.stanzas === 'string') {
      try {
        const parsed: unknown = JSON.parse(hymn.stanzas);
        if (Array.isArray(parsed)) stanzas = parsed as Array<{ number?: number; text?: string }>;
      } catch {
        // Preserve legacy raw-lyrics records through the lyrics fallback.
      }
    }

    const lyrics = stanzas.length > 0
      ? stanzas.map((stanza) => stanza.text ?? '').filter(Boolean).join('\n\n')
      : typeof hymn.stanzas === 'string' && !hymn.stanzas.trim().startsWith('[')
        ? hymn.stanzas
        : '';
    return { ...hymn, stanzas, lyrics };
  }

  async list(search?: string, category?: string) {
    const db = this.dbService.getDb();

    if (search) {
      const term = `%${search}%`;
      const rows = await db
        .select()
        .from(schema.hymns)
        .where(
          or(
            like(schema.hymns.title, term),
            like(schema.hymns.author, term),
            like(schema.hymns.category, term),
            sql`${schema.hymns.stanzas}::text ILIKE ${term}`,
          ),
        )
        .orderBy(schema.hymns.hymnNumber);
      return rows.map((row) => this.normalizeHymn(row));
    }

    if (category) {
      const rows = await db
        .select()
        .from(schema.hymns)
        .where(like(schema.hymns.category, `%${category}%`))
        .orderBy(schema.hymns.hymnNumber);
      return rows.map((row) => this.normalizeHymn(row));
    }

    const rows = await db.select().from(schema.hymns).orderBy(schema.hymns.hymnNumber);
    return rows.map((row) => this.normalizeHymn(row));
  }

  async getById(id: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.hymns)
      .where(eq(schema.hymns.id, id))
      .limit(1);
    return rows[0] ? this.normalizeHymn(rows[0]) : null;
  }

  async getByNumber(hymnNumber: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.hymns)
      .where(eq(schema.hymns.hymnNumber, hymnNumber))
      .limit(1);
    return rows[0] ?? null;
  }

  async getRandom() {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.hymns)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return rows[0] ?? null;
  }

  async getCategories(): Promise<string[]> {
    const db = this.dbService.getDb();
    const rows = await db
      .select({ category: schema.hymns.category })
      .from(schema.hymns)
      .groupBy(schema.hymns.category)
      .orderBy(schema.hymns.category);
    return rows.map((r: any) => r.category).filter(Boolean);
  }
}
