import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import * as schema from '@db/schema';
import { eq } from 'drizzle-orm';

export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getMe(user: any) {
    if (!user) return null;
    const db = this.dbService.getDb();
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    return rows[0] ?? user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const db = this.dbService.getDb();

    const updateData: Partial<typeof schema.users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;

    const updated = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId))
      .returning();

    // Mirror to secondary database if available
    const neonDb = this.dbService.getNeonDb();
    const supabaseDb = this.dbService.getSupabaseDb();
    const primaryDb = db;
    const secondaryDb = primaryDb === neonDb ? supabaseDb : neonDb;

    if (secondaryDb && secondaryDb !== primaryDb) {
      secondaryDb
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId))
        .catch((err: Error) => {
          this.logger.warn(`Secondary DB user mirror update failed: ${err.message}`);
        });
    }

    return updated[0] ?? null;
  }
}
