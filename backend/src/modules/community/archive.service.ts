import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import * as schema from '../../database/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export interface ArchiveSnapshotResult {
  snapshotId: number;
  communityId?: string | null;
  groupId?: number | null;
  channelType: string;
  archiveDate: string;
  storageProvider: string;
  storagePath: string;
  messageCount: number;
  fileSizeBytes: number;
  checksum: string;
  storageUrl?: string;
}

@Injectable()
export class ChatArchiveService implements OnModuleInit {
  private readonly logger = new Logger(ChatArchiveService.name);
  private archiveClient: SupabaseClient | null = null;
  private readonly bucketName: string;
  private isSecondaryProject = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly dbService: DatabaseService,
  ) {
    this.bucketName =
      this.configService.get<string>('ARCHIVE_SUPABASE_BUCKET') ||
      process.env.ARCHIVE_SUPABASE_BUCKET ||
      'chat-bulk-archives';

    this.initArchiveClient();
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private initArchiveClient(): void {
    // Check for Secondary Supabase Project credentials first
    const secondaryUrl =
      this.configService.get<string>('ARCHIVE_SUPABASE_URL') ||
      process.env.ARCHIVE_SUPABASE_URL;
    const secondaryKey =
      this.configService.get<string>('ARCHIVE_SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.ARCHIVE_SUPABASE_SERVICE_ROLE_KEY;

    // Primary project credentials as fallback
    const primaryUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL;
    const primaryKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (secondaryUrl && secondaryKey) {
      this.archiveClient = createClient(secondaryUrl, secondaryKey, {
        auth: { persistSession: false },
      });
      this.isSecondaryProject = true;
      this.logger.log(`[ChatArchiveService] Initialized with DEDICATED Secondary Supabase Archive Project: ${secondaryUrl}`);
    } else if (primaryUrl && primaryKey) {
      this.archiveClient = createClient(primaryUrl, primaryKey, {
        auth: { persistSession: false },
      });
      this.isSecondaryProject = false;
      this.logger.log(`[ChatArchiveService] Secondary Supabase not configured yet. Fallback to Primary Supabase for archive storage.`);
    } else {
      this.logger.warn(`[ChatArchiveService] No Supabase credentials available. Bulk archiving to cloud storage disabled.`);
    }
  }

  private async ensureBucketExists(): Promise<void> {
    if (!this.archiveClient) return;
    try {
      const { data: buckets } = await this.archiveClient.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === this.bucketName);
      if (!exists) {
        await this.archiveClient.storage.createBucket(this.bucketName, {
          public: false,
        });
        this.logger.log(`[ChatArchiveService] Created storage bucket '${this.bucketName}' on ${this.isSecondaryProject ? 'Secondary' : 'Primary'} Supabase Project.`);
      }
    } catch (err: any) {
      this.logger.debug(`[ChatArchiveService] ensureBucketExists: ${err.message}`);
    }
  }

  /**
   * Creates a bulk archive snapshot of messages for a community or class group
   * and uploads it to the dedicated secondary Supabase project bucket.
   */
  async createBulkSnapshot(options: {
    communityId?: string;
    groupId?: number;
    channelType?: string;
  }): Promise<ArchiveSnapshotResult> {
    const db = this.dbService.getDb();
    const channelType = options.channelType || (options.groupId ? 'group' : 'community');
    const now = new Date();
    const archiveDate = now.toISOString().split('T')[0]; // '2026-10-03'
    const archiveYearMonth = archiveDate.substring(0, 7); // '2026-10'

    // 1. Fetch messages from Postgres database
    let query = db
      .select({
        id: schema.chatMessages.id,
        channelType: schema.chatMessages.channelType,
        communityId: schema.chatMessages.communityId,
        groupId: schema.chatMessages.groupId,
        senderId: schema.chatMessages.senderId,
        receiverId: schema.chatMessages.receiverId,
        content: schema.chatMessages.content,
        mediaUrl: schema.chatMessages.mediaUrl,
        isEncrypted: schema.chatMessages.isEncrypted,
        isPinned: schema.chatMessages.isPinned,
        isKept: schema.chatMessages.isKept,
        isAnnouncement: schema.chatMessages.isAnnouncement,
        createdAt: schema.chatMessages.createdAt,
        expiresAt: schema.chatMessages.expiresAt,
        senderName: schema.users.name,
        senderEmail: schema.users.email,
        senderRole: schema.users.role,
      })
      .from(schema.chatMessages)
      .innerJoin(schema.users, eq(schema.chatMessages.senderId, schema.users.id))
      .where(eq(schema.chatMessages.isDeleted, false));

    if (options.groupId) {
      query = (query as any).where(
        and(
          eq(schema.chatMessages.isDeleted, false),
          eq(schema.chatMessages.groupId, options.groupId),
        ),
      );
    } else if (options.communityId) {
      query = (query as any).where(
        and(
          eq(schema.chatMessages.isDeleted, false),
          eq(schema.chatMessages.communityId, options.communityId),
        ),
      );
    } else {
      query = (query as any).where(
        and(
          eq(schema.chatMessages.isDeleted, false),
          eq(schema.chatMessages.channelType, channelType),
        ),
      );
    }

    const messages = await (query as any).orderBy(asc(schema.chatMessages.createdAt));

    // 2. Prepare JSON payload
    const snapshotPayload = {
      archiveTimestamp: now.toISOString(),
      archiveDate,
      archiveYearMonth,
      channelType,
      communityId: options.communityId || null,
      groupId: options.groupId || null,
      storageProvider: this.isSecondaryProject ? 'supabase_secondary' : 'supabase_primary',
      totalMessages: messages.length,
      messages,
    };

    const jsonString = JSON.stringify(snapshotPayload, null, 2);
    const fileBuffer = Buffer.from(jsonString, 'utf-8');
    const fileSizeBytes = fileBuffer.length;
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 3. Storage file path: archives/{communityId_or_global}/{target}/{yearMonth}/{date}_{timestamp}.json
    const folderKey = options.communityId || 'general_channels';
    const subKey = options.groupId ? `group_${options.groupId}` : channelType;
    const storagePath = `archives/${folderKey}/${subKey}/${archiveYearMonth}/${archiveDate}_${Date.now()}.json`;

    let storageUrl: string | undefined;

    // 4. Upload to Secondary Supabase Storage
    if (this.archiveClient) {
      try {
        const { error: uploadError } = await this.archiveClient.storage
          .from(this.bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: 'application/json',
            upsert: true,
          });

        if (uploadError) {
          this.logger.error(`[ChatArchiveService] Upload error: ${uploadError.message}`);
        } else {
          // Generate signed URL (valid for 7 days)
          const { data: signedData } = await this.archiveClient.storage
            .from(this.bucketName)
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
          storageUrl = signedData?.signedUrl;
        }
      } catch (uploadErr: any) {
        this.logger.error(`[ChatArchiveService] Failed to upload to Supabase: ${uploadErr.message}`);
      }
    }

    // 5. Insert index record into chatBulkSnapshots
    const [inserted] = await db
      .insert(schema.chatBulkSnapshots)
      .values({
        communityId: options.communityId || null,
        groupId: options.groupId || null,
        channelType,
        archiveYearMonth,
        archiveDate,
        storageProvider: this.isSecondaryProject ? 'supabase_secondary' : 'supabase_primary',
        storagePath,
        storageUrl: storageUrl || null,
        messageCount: messages.length,
        fileSizeBytes,
        checksum,
      })
      .returning();

    if (!inserted) {
      throw new Error('Failed to create snapshot record in database');
    }

    this.logger.log(
      `[ChatArchiveService] Created bulk snapshot #${inserted.id} (${messages.length} messages, ${fileSizeBytes} bytes) on ${this.isSecondaryProject ? 'Secondary' : 'Primary'} Supabase Project: ${storagePath}`,
    );

    return {
      snapshotId: inserted.id,
      communityId: inserted.communityId,
      groupId: inserted.groupId,
      channelType: inserted.channelType,
      archiveDate: inserted.archiveDate,
      storageProvider: inserted.storageProvider,
      storagePath: inserted.storagePath,
      messageCount: inserted.messageCount,
      fileSizeBytes: inserted.fileSizeBytes,
      checksum: inserted.checksum || checksum,
      storageUrl: inserted.storageUrl || storageUrl,
    };
  }

  /**
   * Lists available cloud snapshots for a community or group
   */
  async listAvailableSnapshots(options: {
    communityId?: string;
    groupId?: number;
  }) {
    const db = this.dbService.getDb();
    let query = db.select().from(schema.chatBulkSnapshots);

    if (options.groupId) {
      query = (query as any).where(eq(schema.chatBulkSnapshots.groupId, options.groupId));
    } else if (options.communityId) {
      query = (query as any).where(eq(schema.chatBulkSnapshots.communityId, options.communityId));
    }

    return (query as any).orderBy(desc(schema.chatBulkSnapshots.createdAt));
  }

  /**
   * Downloads a snapshot from the Secondary Supabase project and returns the messages
   */
  async downloadSnapshot(snapshotId: number): Promise<{
    snapshot: any;
    messages: any[];
    totalMessages: number;
  }> {
    const db = this.dbService.getDb();
    const [record] = await db
      .select()
      .from(schema.chatBulkSnapshots)
      .where(eq(schema.chatBulkSnapshots.id, snapshotId));

    if (!record) {
      throw new NotFoundException(`Snapshot #${snapshotId} not found`);
    }

    if (!this.archiveClient) {
      throw new Error('Supabase archive storage client is not configured');
    }

    const { data: fileBlob, error: downloadError } = await this.archiveClient.storage
      .from(this.bucketName)
      .download(record.storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message || 'Failed to download snapshot file');
    }

    const textContent = await fileBlob.text();
    const parsed = JSON.parse(textContent);

    return {
      snapshot: record,
      messages: parsed.messages || [],
      totalMessages: parsed.totalMessages || (parsed.messages || []).length,
    };
  }

  /**
   * Triggers bulk snapshots for all active communities and groups
   */
  async snapshotAllActiveCommunities(): Promise<{
    snapshotsCreated: number;
    results: ArchiveSnapshotResult[];
  }> {
    const db = this.dbService.getDb();
    const communitiesList = await db.select().from(schema.communities);
    const groupsList = await db.select().from(schema.groups);

    const results: ArchiveSnapshotResult[] = [];

    // General channel snapshot
    try {
      const genSnapshot = await this.createBulkSnapshot({ channelType: 'general' });
      results.push(genSnapshot);
    } catch (err: any) {
      this.logger.warn(`Failed general snapshot: ${err.message}`);
    }

    // Community snapshots
    for (const comm of communitiesList) {
      try {
        const commSnapshot = await this.createBulkSnapshot({
          communityId: comm.id,
          channelType: 'community',
        });
        results.push(commSnapshot);
      } catch (err: any) {
        this.logger.warn(`Failed community snapshot for ${comm.name}: ${err.message}`);
      }
    }

    // Class group snapshots
    for (const grp of groupsList) {
      try {
        const grpSnapshot = await this.createBulkSnapshot({
          communityId: grp.communityId,
          groupId: grp.id,
          channelType: 'group',
        });
        results.push(grpSnapshot);
      } catch (err: any) {
        this.logger.warn(`Failed group snapshot for group #${grp.id}: ${err.message}`);
      }
    }

    return {
      snapshotsCreated: results.length,
      results,
    };
  }
}
