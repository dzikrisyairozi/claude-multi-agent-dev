export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";
import { documentIngestionService } from "@/service/rag/triggerEmbeddings";
import type { IngestionResult } from "@/types/rag";
import { DocumentRecord } from "@/types/document";
import { logActivity } from "@/service/activityLog/activityLog";

export async function POST(req: NextRequest) {
  const totalTimer = `[Timing] Total /api/rag/ingest - ${Date.now()}`;
  console.time(totalTimer);

  try {
    const authHeader = req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const documentIds: string[] = Array.isArray(body?.documentIds)
      ? Array.from(new Set(body.documentIds.map((id: any) => String(id))))
      : [];

    if (!documentIds.length) {
      return NextResponse.json(
        { error: "documentIds array is required" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: userError?.message || "Unable to authenticate user" },
        { status: 401 }
      );
    }

    const { data: docsData, error: docsError } = await supabase
      .from("documents")
      .select(
        "id, user_id, file_name, file_path, mime_type, file_size, text_content"
      )
      .in("id", documentIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    const documents = (docsData ?? []) as DocumentRecord[];

    if (!documents || !documents.length) {
      return NextResponse.json(
        { error: "No documents found for ingestion" },
        { status: 404 }
      );
    }

    const settledResults = await Promise.allSettled(
      documents.map((doc) =>
        documentIngestionService.ingestDocumentEmbeddings({ document: doc, supabase })
      )
    );

    const results: IngestionResult[] = settledResults.map((settled, index) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      }
      return {
        documentId: documents[index].id,
        status: "failed" as const,
        reason: settled.reason?.message || "Unexpected ingestion failure",
      };
    });

    const summary = results.reduce(
      (acc, curr) => {
        if (curr.status === "processed") acc.processed += 1;
        if (curr.status === "skipped") acc.skipped += 1;
        if (curr.status === "failed") acc.failed += 1;
        return acc;
      },
      { processed: 0, skipped: 0, failed: 0 }
    );

    // Log activity for each successfully processed document
    for (const result of results) {
      if (result.status === "processed") {
        const doc = documents.find((d) => d.id === result.documentId);
        logActivity(supabase, user.id, {
          action: "rag_ingest",
          entity_type: "file",
          entity_id: result.documentId,
          entity_name: doc?.file_name,
          new_values: {
            chunks_count: result.chunks,
          },
          metadata: { status: "processed" },
        });
      }
    }

    console.timeEnd(totalTimer);
    return NextResponse.json({ results, summary });
  } catch (error: any) {
    console.timeEnd(totalTimer);
    console.error("RAG ingestion failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Error ingesting documents",
      },
      { status: 500 }
    );
  }
}
