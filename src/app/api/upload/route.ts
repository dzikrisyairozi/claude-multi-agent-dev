export const runtime = "nodejs";

import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3 } from "@/service/s3/uploadFile";
import { supabaseServer } from "@/integrations/supabase/server";
import { DocumentRecord, FileUploadResult } from "@/types/document";
import { logActivity } from "@/service/activityLog/activityLog";
import { documentIngestionService } from "@/service/rag/triggerEmbeddings";

const normalizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * Background ingestion with 3 retries and exponential backoff.
 * Logs timing to console only.
 */
async function backgroundIngestWithRetry(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  userId: string;
  documentId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}) {
  const maxRetries = 3;
  const start = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await documentIngestionService.embedFromBuffer(params);
      const elapsed = Date.now() - start;
      if (result.status === "processed") {
        console.log(
          `[Ingestion] "${params.fileName}" finished in ${elapsed} ms (${result.chunks} chunks)`
        );
      } else if (result.status === "skipped") {
        console.log(
          `[Ingestion] "${params.fileName}" skipped: ${result.reason}`
        );
      } else {
        throw new Error(result.reason || "Ingestion failed");
      }
      return;
    } catch (err) {
      const elapsed = Date.now() - start;
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(
          `[Ingestion] "${params.fileName}" attempt ${attempt} failed (${elapsed} ms), retrying in ${delay} ms...`,
          err instanceof Error ? err.message : err
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(
          `[Ingestion] "${params.fileName}" failed after ${maxRetries} retries (${elapsed} ms)`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const totalStart = Date.now();

  try {
    const authHeader = req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const metadataList = files.map((_, index) => {
      const metadataRaw = formData.get(`metadata_${index}`);
      if (metadataRaw && typeof metadataRaw === "string") {
        try {
          return JSON.parse(metadataRaw);
        } catch (error) {
          console.warn("Failed to parse metadata for file", index, error);
        }
      }
      return {};
    });

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message || "Unable to authenticate user" },
        { status: 401 },
      );
    }

    const settled = await Promise.allSettled(
      files.map(async (file, index) => {
        const fileStart = Date.now();
        const originalName = file.name || "upload";
        const buffer = Buffer.from(await file.arrayBuffer());

        // Quick hash first — enables parallel S3 upload + duplicate check
        const fileHash = createHash("sha256").update(buffer).digest("hex");

        // Check for duplicate: same user, same file content
        const { data: existing } = await supabase
          .from("documents")
          .select(
            "id, user_id, file_name, file_path, mime_type, file_size, file_hash, created_at, folder_id",
          )
          .eq("user_id", user.id)
          .eq("file_hash", fileHash)
          .maybeSingle();

        if (existing) {
          return {
            doc: { ...existing, text_content: null, duplicate: true } as DocumentRecord & { duplicate: boolean },
            uploadMs: Date.now() - fileStart,
          };
        }

        const mimeType = file.type || "application/octet-stream";
        const key = `uploads/${user.id}/${randomUUID()}_${normalizeFileName(originalName)}`;

        // Await S3 upload only
        await uploadFileToS3({
          key,
          body: buffer,
          contentType: mimeType,
          metadata: {
            originalname: encodeURIComponent(originalName),
            uploaded_by: user.id,
          },
        });

        const metadata = metadataList[index] || {};

        // No text_content — we use input_file now
        const { data, error } = await supabase
          .from("documents")
          .insert({
            file_name: originalName,
            file_path: key,
            text_content: null,
            content_hash: null,
            mime_type: (metadata?.mimeType as string) ?? file.type ?? null,
            file_size: (metadata?.size as number) ?? file.size ?? null,
            file_hash: fileHash,
          })
          .select(
            "id, user_id, file_name, file_path, mime_type, file_size, file_hash, created_at, folder_id",
          )
          .single();

        if (error || !data) {
          throw new Error(error?.message ?? "Failed to save document record");
        }

        // Fire ingestion in background (3 retries) — don't await
        backgroundIngestWithRetry({
          buffer,
          mimeType,
          fileName: originalName,
          userId: user.id,
          documentId: data.id,
          supabase,
        });

        // Log activity (fire-and-forget)
        logActivity(supabase, user.id, {
          action: "file_upload",
          entity_type: "file",
          entity_id: data.id,
          entity_name: data.file_name,
          new_values: {
            file_name: data.file_name,
            file_path: data.file_path,
            mime_type: data.mime_type,
            file_size: data.file_size,
          },
        });

        return {
          doc: { ...data, text_content: null } as DocumentRecord,
          uploadMs: Date.now() - fileStart,
        };
      }),
    );

    const results: FileUploadResult[] = settled.map((result, index) => {
      const originalName = files[index].name || "upload";
      if (result.status === "fulfilled") {
        return {
          status: "success" as const,
          document: result.value.doc,
          fileName: originalName,
          uploadMs: result.value.uploadMs,
        };
      } else {
        console.error(`Upload failed for "${originalName}":`, result.reason);
        return {
          status: "failed" as const,
          fileName: originalName,
          error: result.reason?.message || "Unknown error",
        };
      }
    });

    const successCount = results.filter((r) => r.status === "success").length;
    const failureCount = results.filter((r) => r.status === "failed").length;
    const httpStatus = failureCount > 0 ? 207 : 200;
    const totalMs = Date.now() - totalStart;

    console.log(`[Upload] Total: ${totalMs} ms (${successCount} success, ${failureCount} failed)`);

    return NextResponse.json(
      { results, successCount, failureCount, totalMs },
      { status: httpStatus },
    );
  } catch (error: unknown) {
    console.error("Upload error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error uploading files",
      },
      { status: 500 },
    );
  }
}
