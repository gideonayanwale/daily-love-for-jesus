import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import * as schema from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface AddFavoriteDto {
  type: 'verse' | 'hymn' | 'devotional';
  itemId: number;
  reference?: string;
}

@Injectable()
export class FavoritesService {
  constructor(private readonly dbService: DatabaseService) {}

  async list(userId: string, type?: 'verse' | 'hymn' | 'devotional') {
    const db = this.dbService.getDb();

    let query = db.select().from(schema.userFavorites);
    if (type) {
      query = query.where(
        and(eq(schema.userFavorites.userId, userId), eq(schema.userFavorites.type, type)),
      );
    } else {
      query = query.where(eq(schema.userFavorites.userId, userId));
    }

    return query.orderBy(desc(schema.userFavorites.createdAt));
  }

  async add(userId: string, dto: AddFavoriteDto) {
    const db = this.dbService.getDb();

    const existing = await db
      .select()
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, userId),
          eq(schema.userFavorites.type, dto.type),
          eq(schema.userFavorites.itemId, dto.itemId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(schema.userFavorites)
      .values({
        userId,
        type: dto.type,
        itemId: dto.itemId,
        reference: dto.reference ?? null,
      })
      .returning();

    return inserted[0] ?? null;
  }

  async remove(userId: string, type: 'verse' | 'hymn' | 'devotional', itemId: number) {
    const db = this.dbService.getDb();
    await db
      .delete(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, userId),
          eq(schema.userFavorites.type, type),
          eq(schema.userFavorites.itemId, itemId),
        ),
      );
    return { success: true };
  }
}
