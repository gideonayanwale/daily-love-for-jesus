import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export interface CreateDevotionalDto {
  title: string;
  scripture?: string;
  scriptureText?: string;
  body: string;
  reflection?: string;
  prayer?: string;
  author?: string;
  source?: 'telegram' | 'manual' | 'api';
  devotionalDate?: Date | string;
}

@Injectable()
export class DevotionalsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getToday() {
    const db = this.dbService.getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await db
      .select()
      .from(schema.devotionals)
      .where(
        and(
          gte(schema.devotionals.devotionalDate, today),
          eq(schema.devotionals.isPublished, true),
        ),
      )
      .orderBy(schema.devotionals.devotionalDate)
      .limit(1);

    if (rows.length > 0) return rows[0];

    // Fallback to most recent published devotional
    const fallback = await db
      .select()
      .from(schema.devotionals)
      .where(eq(schema.devotionals.isPublished, true))
      .orderBy(desc(schema.devotionals.devotionalDate))
      .limit(1);

    return fallback[0] ?? null;
  }

  async getById(id: number) {
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.devotionals)
      .where(eq(schema.devotionals.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async list(limit: number = 20, offset: number = 0) {
    const db = this.dbService.getDb();

    const items = await db
      .select()
      .from(schema.devotionals)
      .where(eq(schema.devotionals.isPublished, true))
      .orderBy(desc(schema.devotionals.devotionalDate))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.devotionals)
      .where(eq(schema.devotionals.isPublished, true));

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async create(dto: CreateDevotionalDto) {
    const db = this.dbService.getDb();
    const inserted = await db
      .insert(schema.devotionals)
      .values({
        title: dto.title,
        scripture: dto.scripture ?? null,
        scriptureText: dto.scriptureText ?? null,
        body: dto.body,
        reflection: dto.reflection ?? null,
        prayer: dto.prayer ?? null,
        author: dto.author ?? null,
        source: dto.source ?? 'manual',
        devotionalDate: dto.devotionalDate ? new Date(dto.devotionalDate) : new Date(),
        isPublished: true,
      })
      .returning();

    return inserted[0] ?? null;
  }
}
