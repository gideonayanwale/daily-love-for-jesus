import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, like, or, sql } from 'drizzle-orm';

@Injectable()
export class HymnsService {
  constructor(private readonly dbService: DatabaseService) {}

  async list(search?: string, category?: string) {
    const db = this.dbService.getDb();

    if (search) {
      const term = `%${search}%`;
      return db
        .select()
        .from(schema.hymns)
        .where(
          or(
            like(schema.hymns.title, term),
            like(schema.hymns.author, term),
            like(schema.hymns.category, term),
          ),
        )
        .orderBy(schema.hymns.hymnNumber);
    }

    if (category) {
      return db
        .select()
        .from(schema.hymns)
        .where(like(schema.hymns.category, `%${category}%`))
        .orderBy(schema.hymns.hymnNumber);
    }

    return db.select().from(schema.hymns).orderBy(schema.hymns.hymnNumber);
  }

  async getById(id: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.hymns)
      .where(eq(schema.hymns.id, id))
      .limit(1);
    return rows[0] ?? null;
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
