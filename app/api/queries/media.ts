import { eq } from "drizzle-orm";
import { mediaUploads } from "@db/schema";
import type { MediaUpload } from "@db/schema";
import { getDb } from "./connection";

export async function logMediaUpload(params: {
  userId: string;
  cloudinaryUrl: string;
  supabaseUrl?: string;
  fileName: string;
  mimeType: string;
  size?: number;
}): Promise<MediaUpload | undefined> {
  const db = getDb();
  const result = await db
    .insert(mediaUploads)
    .values({
      userId: params.userId,
      cloudinaryUrl: params.cloudinaryUrl,
      supabaseUrl: params.supabaseUrl ?? null,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.size ?? null,
    })
    .$returningId();

  const rows = await db
    .select()
    .from(mediaUploads)
    .where(eq(mediaUploads.id, result[0].id))
    .limit(1);

  return rows.at(0);
}
