import { createHmac } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createRouter, adminQuery } from "./middleware";
import { env } from "./lib/env";
import { logMediaUpload } from "./queries/media";

export const mediaRouter = createRouter({
  /**
   * Generate a signed Cloudinary upload URL.
   * The client uses the returned uploadUrl + fields to upload directly to Cloudinary.
   */
  uploadUrl: adminQuery
    .input(
      z.object({
        fileName: z.string().max(500),
        mimeType: z.string().max(100),
        folder: z.string().max(100).default("devotionals"),
      })
    )
    .mutation(async ({ input }) => {
      const { folder } = input;
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = nanoid(12);

      // Build the string to sign (params sorted alphabetically)
      const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
      const signature = createHmac("sha1", env.cloudinaryApiSecret)
        .update(paramsToSign + env.cloudinaryApiSecret)
        .digest("hex");

      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`,
        fields: {
          api_key: env.cloudinaryApiKey,
          timestamp,
          public_id: publicId,
          folder,
          signature,
        },
      };
    }),

  /**
   * Archive a Cloudinary asset to Supabase Storage and log the upload.
   * Returns the Supabase storage URL.
   */
  archiveToSupabase: adminQuery
    .input(
      z.object({
        cloudinaryUrl: z.string().url(),
        fileName: z.string().max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cloudinaryUrl, fileName } = input;

      try {
        // Fetch the file from Cloudinary
        const fileResponse = await fetch(cloudinaryUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch Cloudinary file: ${fileResponse.statusText}`);
        }

        const mimeType = fileResponse.headers.get("content-type") ?? "application/octet-stream";
        const fileBuffer = await fileResponse.arrayBuffer();

        // Determine storage bucket path
        const storagePath = `media/${Date.now()}_${fileName}`;

        // Upload to Supabase Storage via REST API
        const uploadResponse = await fetch(
          `${env.supabaseUrl}/storage/v1/object/media-uploads/${storagePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
              "Content-Type": mimeType,
              "x-upsert": "true",
            },
            body: fileBuffer,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(`Supabase storage upload failed: ${uploadResponse.statusText}`);
        }

        const supabaseUrl = `${env.supabaseUrl}/storage/v1/object/public/media-uploads/${storagePath}`;

        // Log the upload record
        await logMediaUpload({
          userId: ctx.user.id,
          cloudinaryUrl,
          supabaseUrl,
          fileName,
          mimeType,
          size: fileBuffer.byteLength,
        });

        return { supabaseUrl };
      } catch (err) {
        console.error("[mediaRouter] archiveToSupabase error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to archive media to Supabase",
        });
      }
    }),
});
