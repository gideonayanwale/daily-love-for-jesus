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
        folder: z.string().min(1).max(100).regex(/^[a-zA-Z0-9/_-]+$/).refine((value) => !value.includes(".."), "Invalid folder path").default("devotionals"),
      })
    )
    .mutation(async ({ input }) => {
      const { folder } = input;
      if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cloudinary uploads are not configured." });
      }
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
        cloudinaryUrl: z.string().url().refine((value) => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password;
          } catch {
            return false;
          }
        }, "Only secure Cloudinary asset URLs are accepted"),
        fileName: z.string().max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cloudinaryUrl, fileName } = input;
      if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Supabase Storage is not configured." });
      }

      try {
        // Fetch only verified Cloudinary URLs; reject oversized or unexpected media.
        const fileResponse = await fetch(cloudinaryUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch Cloudinary file: ${fileResponse.statusText}`);
        }

        const mimeType = (fileResponse.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
          throw new Error("Only image and video uploads are supported.");
        }
        const declaredLength = Number(fileResponse.headers.get("content-length") ?? 0);
        const maxBytes = 15 * 1024 * 1024;
        if (declaredLength > maxBytes) throw new Error("Media file exceeds the 15 MB limit.");
        const fileBuffer = await fileResponse.arrayBuffer();
        if (fileBuffer.byteLength > maxBytes) throw new Error("Media file exceeds the 15 MB limit.");

        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 180) || "upload";
        const storagePath = "media/" + Date.now() + "_" + safeFileName;

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
