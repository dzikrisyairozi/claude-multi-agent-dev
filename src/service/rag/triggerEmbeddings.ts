import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Readable } from "stream";
import { createHash } from "crypto";
import "pdf-parse/worker"; // Must load before PDFParse — polyfills DOMMatrix for Vercel
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { DocumentRecord } from "@/types/document";
import { AI_CONFIG } from "@/app/api/openai/respond/config/ai.config";
import type { IngestionResult, ExtractionResult } from "@/types/rag";
import {
  geminiBatchTextEmbedding,
  geminiMultimodalEmbedding,
  isMultimodalEmbeddable,
} from "@/service/gemini/embedding";
import { extractFileContent } from "@/service/openai/extractFileContent";

export type { IngestionResult, ExtractionResult } from "@/types/rag";

const s3Bucket = process.env.AWS_S3_BUCKET;

const s3Client =
  s3Bucket &&
  new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

class DocumentIngestionService {
  // ─── Private ───

  /**
   * Strip characters that PostgreSQL text columns reject:
   * - U+0000 null bytes (literal and backslash-escaped)
   * - Other C0/C1 control characters except \t \n \r
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/\u0000/g, "")
      .replace(/\\u0000/g, "")
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  private async streamToBuffer(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async getFileFromS3(key: string) {
    if (!s3Client || !s3Bucket) {
      throw new Error("S3 is not configured");
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      }),
    );

    const body = response.Body;
    if (!body || !(body instanceof Readable)) {
      throw new Error("Unable to download file from storage");
    }

    const buffer = await this.streamToBuffer(body);

    return {
      buffer,
      contentType: response.ContentType ?? undefined,
    };
  }

  private normalizeText(content: string) {
    return content.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
  }

  /**
   * Split text into sentences respecting common sentence boundaries
   * Handles periods, question marks, exclamation points, and common abbreviations
   */
  private splitIntoSentences(text: string): string[] {
    // Common abbreviations that shouldn't trigger sentence splits
    const abbreviations = [
      "Mr",
      "Mrs",
      "Ms",
      "Dr",
      "Prof",
      "Sr",
      "Jr",
      "Inc",
      "Ltd",
      "Co",
      "Corp",
      "etc",
      "vs",
      "e.g",
      "i.e",
    ];

    // Replace abbreviations temporarily to avoid false splits
    let processed = text;
    const abbrevMap = new Map<string, string>();
    abbreviations.forEach((abbr, idx) => {
      const placeholder = `__ABBR${idx}__`;
      abbrevMap.set(placeholder, abbr);
      processed = processed.replace(
        new RegExp(`\\b${abbr}\\.`, "gi"),
        placeholder,
      );
    });

    // Split on sentence boundaries: . ! ? followed by space and capital letter
    const sentences = processed
      .split(/([.!?]+)\s+(?=[A-Z])/)
      .reduce((acc: string[], part, idx, arr) => {
        if (idx % 2 === 0) {
          const sentence = part + (arr[idx + 1] || "");
          if (sentence.trim()) acc.push(sentence.trim());
        }
        return acc;
      }, []);

    // Restore abbreviations
    return sentences.map((sentence) => {
      let restored = sentence;
      abbrevMap.forEach((abbr, placeholder) => {
        restored = restored.replace(new RegExp(placeholder, "g"), `${abbr}.`);
      });
      return restored;
    });
  }

  /**
   * Chunk text respecting sentence boundaries
   * Creates overlapping chunks with sentences that fit within size limits
   */
  private chunkText(
    content: string,
    chunkSize = AI_CONFIG.CHUNKING.CHUNK_SIZE,
    overlap = AI_CONFIG.CHUNKING.OVERLAP,
  ) {
    const normalized = this.normalizeText(content);
    if (!normalized) return [];

    const sentences = this.splitIntoSentences(normalized);
    const chunks: string[] = [];

    let currentChunk: string[] = [];
    let currentSize = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceLength = sentence.length + 1; // +1 for space

      // If single sentence exceeds chunk size, split it at character boundaries
      if (sentenceLength > chunkSize) {
        // Flush current chunk first
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(" "));
          currentChunk = [];
          currentSize = 0;
        }

        // Split long sentence
        let start = 0;
        while (start < sentence.length) {
          const piece = sentence.slice(start, start + chunkSize).trim();
          if (piece) chunks.push(piece);
          start += chunkSize - overlap;
        }
        continue;
      }

      // If adding this sentence would exceed chunk size, start new chunk
      if (currentSize + sentenceLength > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(" "));

        // Create overlap by keeping last few sentences
        const overlapSentences: string[] = [];
        let overlapSize = 0;
        for (let j = currentChunk.length - 1; j >= 0; j--) {
          const sent = currentChunk[j];
          if (overlapSize + sent.length + 1 <= overlap) {
            overlapSentences.unshift(sent);
            overlapSize += sent.length + 1;
          } else {
            break;
          }
        }

        currentChunk = overlapSentences;
        currentSize = overlapSize;
      }

      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentSize += sentenceLength;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
    }

    return chunks;
  }

  private async generateEmbeddings(segments: string[]): Promise<number[][]> {
    // Gemini embedContent supports multiple texts in a single call
    // but has limits, so batch in groups of 80
    const maxBatch = 80;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < segments.length; i += maxBatch) {
      const batch = segments.slice(i, i + maxBatch);
      const batchEmbeddings = await geminiBatchTextEmbedding(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  // ─── Public ───

  public async extractTextFromBuffer(params: {
    buffer: Buffer;
    mimeType?: string | null;
    fileName: string;
  }): Promise<ExtractionResult> {
    const result = await this.extractTextFromBufferUnsafe(params);
    return { text: result.text ? this.sanitizeText(result.text) : result.text };
  }

  private async extractTextFromBufferUnsafe({
    buffer,
    mimeType,
    fileName,
  }: {
    buffer: Buffer;
    mimeType?: string | null;
    fileName: string;
  }): Promise<ExtractionResult> {
    const normalizedMime = mimeType?.toLowerCase() ?? "";
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

    // Handle PDF files via pdf-parse v2
    if (normalizedMime === "application/pdf" || extension === "pdf") {
      let parser: InstanceType<typeof PDFParse> | null = null;
      try {
        parser = new PDFParse({ data: buffer });
        const parts: string[] = [];

        // 1. Extract text
        const textResult = await parser.getText();
        if (textResult.text?.trim()) {
          parts.push(textResult.text);
        }

        // 2. Extract tables and format as text
        try {
          const tableResult = await parser.getTable();
          if (tableResult) {
            console.log("has tableResult");
          }
          for (const page of tableResult.pages) {
            for (const table of page.tables) {
              if (table.length > 0) {
                const tableText = table
                  .map((row) => row.join(" | "))
                  .join("\n");
                parts.push(`\n[Table]\n${tableText}`);
              }
            }
          }
        } catch (tableError) {
          console.warn(
            `[Text Extraction] Table extraction failed for PDF "${fileName}":`,
            tableError instanceof Error ? tableError.message : tableError,
          );
        }

        // Note: PDF image extraction via Vision API removed — Gemini multimodal
        // embedding handles PDFs natively (images included in embedding)

        const finalText = parts.join("\n");
        if (!finalText.trim()) {
          console.warn(
            `[Text Extraction] PDF file "${fileName}" has no extractable text, tables, or images`,
          );
        }
        return { text: finalText };
      } catch (error) {
        console.error(
          `[Text Extraction] Failed to extract text from PDF "${fileName}":`,
          error instanceof Error ? error.message : error,
        );
        throw new Error(
          "Failed to parse PDF file. It may be corrupted, encrypted, or invalid.",
        );
      } finally {
        await parser?.destroy();
      }
    }

    // Handle DOCX files
    if (
      normalizedMime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      extension === "docx"
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value || "";
        if (!extractedText.trim()) {
          console.warn(
            `[Text Extraction] DOCX file "${fileName}" has no extractable text`,
          );
        }
        if (result.messages.length > 0) {
          console.warn(
            `[Text Extraction] DOCX extraction warnings for "${fileName}":`,
            result.messages,
          );
        }
        return { text: extractedText };
      } catch (error) {
        console.error(
          `[Text Extraction] Failed to extract text from DOCX "${fileName}":`,
          error instanceof Error ? error.message : error,
        );
        return { text: "" };
      }
    }

    // Handle Excel files
    if (
      normalizedMime ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      normalizedMime === "application/vnd.ms-excel" ||
      ["xlsx", "xls"].includes(extension)
    ) {
      try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheets = workbook.SheetNames.map((name) => {
          const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
          return `[Sheet: ${name}]\n${csv}`;
        });
        const extractedText = sheets.join("\n\n");
        if (!extractedText.trim()) {
          console.warn(
            `[Text Extraction] Excel file "${fileName}" has no data`,
          );
        }
        return { text: extractedText };
      } catch (error) {
        console.error(
          `[Text Extraction] Failed to extract from Excel "${fileName}":`,
          error instanceof Error ? error.message : error,
        );
        return { text: "" };
      }
    }

    // Handle Google Docs files
    if (
      normalizedMime === "application/vnd.google-apps.document" ||
      fileName.includes(".gdoc")
    ) {
      console.warn(
        `[Text Extraction] Google Docs file "${fileName}" detected but full support not implemented. Attempting basic JSON parsing.`,
      );
      try {
        // For Google Docs, we need to export them as plain text
        // This requires the Google Docs API, which needs authentication
        // For now, we'll try to parse if it's a JSON export
        if (buffer.toString().startsWith("{")) {
          const gdocData = JSON.parse(buffer.toString());
          // Google Docs JSON export structure
          if (gdocData.body && gdocData.body.content) {
            let text = "";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            gdocData.body.content.forEach((element: any) => {
              if (element.paragraph && element.paragraph.elements) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                element.paragraph.elements.forEach((el: any) => {
                  if (el.textRun && el.textRun.content) {
                    text += el.textRun.content;
                  }
                });
              }
            });
            return { text: text.trim() };
          }
        }
        console.warn(
          `[Text Extraction] Google Docs file "${fileName}" is not in expected JSON format`,
        );
        return { text: "" };
      } catch (error) {
        console.error(
          `[Text Extraction] Failed to extract text from Google Doc "${fileName}":`,
          error instanceof Error ? error.message : error,
        );
        return { text: "" };
      }
    }

    // Text-like formats we can safely decode without extra dependencies
    const isTextLike =
      normalizedMime.startsWith("text/") ||
      ["md", "markdown", "txt", "csv", "json"].includes(extension);

    if (isTextLike) {
      try {
        return { text: buffer.toString("utf-8") };
      } catch (error) {
        console.error(
          `[Text Extraction] Failed to decode text file "${fileName}":`,
          error instanceof Error ? error.message : error,
        );
        return { text: "" };
      }
    }

    // Note: Image Vision API extraction removed — Gemini multimodal
    // embedding handles images natively (PNG, JPEG)

    // Unsupported types
    console.warn(
      `[Text Extraction] Unsupported file type for "${fileName}" (mime: ${normalizedMime}, extension: ${extension})`,
    );
    return { text: "" };
  }

  public async ingestDocumentEmbeddings({
    document,
    supabase,
  }: {
    document: DocumentRecord;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>;
  }): Promise<IngestionResult> {
    const logPrefix = `[RAG Ingestion] Document "${document.file_name}" (${document.id})`;

    const timerId = `${document.file_name}-${document.id.slice(0, 8)}`;
    const totalTimer = `[Timing] Total ingestion - ${timerId}`;
    console.time(totalTimer);

    try {
      console.log(`${logPrefix}: Starting ingestion process`);

      let textContent: string;
      let contentHash: string;

      // If text_content already exists (extracted during upload), skip S3 download
      if (document.text_content?.trim()) {
        console.log(
          `${logPrefix}: Using pre-extracted text_content (${document.text_content.length} chars)`,
        );
        textContent = document.text_content;
        contentHash = document.content_hash
          ? document.content_hash
          : createHash("sha256").update(textContent).digest("hex");
      } else {
        // Step 1: Download file from S3
        const s3Timer = `[Timing] S3 download - ${timerId}`;
        console.time(s3Timer);
        console.log(
          `${logPrefix}: Downloading from S3 (${document.file_path})`,
        );
        const { buffer, contentType } = await this.getFileFromS3(
          document.file_path,
        );
        console.timeEnd(s3Timer);
        console.log(
          `${logPrefix}: Downloaded ${buffer.length} bytes (type: ${contentType})`,
        );

        // Step 2: Extract text
        const extractTimer = `[Timing] Text extraction - ${timerId}`;
        console.time(extractTimer);
        const extraction = await this.extractTextFromBuffer({
          buffer,
          mimeType: document.mime_type ?? contentType,
          fileName: document.file_name,
        });
        console.timeEnd(extractTimer);
        textContent = extraction.text;
        contentHash = createHash("sha256").update(textContent).digest("hex");
      }

      if (!textContent.trim()) {
        console.warn(`${logPrefix}: No text extracted, skipping ingestion`);
        console.timeEnd(totalTimer);
        return {
          documentId: document.id,
          status: "skipped",
          reason: "No text could be extracted from this file",
        };
      }

      console.log(
        `${logPrefix}: Extracted ${textContent.length} characters of text`,
      );

      // Step 3: Check for duplicate content (same user, different document)
      const { data: duplicates } = await supabase
        .from("documents")
        .select("id, file_name")
        .eq("user_id", document.user_id)
        .eq("content_hash", contentHash)
        .neq("id", document.id)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        console.log(
          `${logPrefix}: Duplicate content detected (matches document "${duplicates[0].file_name}" / ${duplicates[0].id}), skipping embedding generation`,
        );

        console.timeEnd(totalTimer);
        return {
          documentId: document.id,
          status: "skipped",
          reason: `Duplicate content detected (matches "${duplicates[0].file_name}")`,
        };
      }

      // Step 5: Chunk text
      const chunks = this.chunkText(textContent);
      if (!chunks.length) {
        console.warn(
          `${logPrefix}: Text extraction succeeded but produced no chunks`,
        );
        console.timeEnd(totalTimer);
        return {
          documentId: document.id,
          status: "skipped",
          reason: "Text extraction succeeded but produced no chunks",
        };
      }

      console.log(
        `${logPrefix}: Created ${chunks.length} chunks for embedding`,
      );

      // Step 6: Generate embeddings
      const embeddingTimer = `[Timing] Embedding generation - ${timerId}`;
      console.time(embeddingTimer);
      console.log(
        `${logPrefix}: Generating embeddings for ${chunks.length} chunks`,
      );
      const embeddings = await this.generateEmbeddings(chunks);
      console.timeEnd(embeddingTimer);
      console.log(`${logPrefix}: Generated ${embeddings.length} embeddings`);

      // Step 7: Insert embeddings into DB
      const dbTimer = `[Timing] DB insert embeddings - ${timerId}`;
      console.time(dbTimer);

      const { error: insertError } = await supabase
        .from("document_embeddings")
        .insert(
          chunks.map((chunk, index) => ({
            user_id: document.user_id,
            document_id: document.id,
            content: chunk,
            embedding: embeddings[index],
            metadata: {
              chunk_index: index,
              file_name: document.file_name,
              file_path: document.file_path,
              length: chunk.length,
            },
          })),
        );

      if (insertError) {
        console.error(
          `${logPrefix}: Failed to insert embeddings:`,
          insertError.message,
        );
        throw new Error(insertError.message);
      }

      console.timeEnd(dbTimer);

      console.log(
        `${logPrefix}: Successfully ingested with ${chunks.length} chunks`,
      );
      console.timeEnd(totalTimer);
      return {
        documentId: document.id,
        status: "processed",
        chunks: chunks.length,
      };
    } catch (error: unknown) {
      console.error(
        `${logPrefix}: Ingestion failed:`,
        error instanceof Error ? error.message : error,
      );
      console.timeEnd(totalTimer);
      return {
        documentId: document.id,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error while ingesting document",
      };
    }
  }

  /**
   * Embed a document directly from its buffer during upload.
   * For PDFs and images: uses Gemini multimodal embedding (no text extraction).
   * For DOCX/XLSX/text: extracts text first, then uses Gemini text embedding.
   * Returns embeddings ready to insert, or null if embedding fails.
   */
  public async embedFromBuffer({
    buffer,
    mimeType,
    fileName,
    userId,
    documentId,
    supabase,
  }: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
    userId: string;
    documentId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>;
  }): Promise<IngestionResult> {
    const logPrefix = `[Embed] "${fileName}" (${documentId.slice(0, 8)})`;
    const timer = `[Timing] embedFromBuffer - ${fileName}`;
    console.time(timer);

    try {
      // For multimodal-embeddable types (PDF, PNG, JPEG):
      // 1. Extract text via OpenAI input_file API
      // 2. Generate aggregated embedding (text + file bytes)
      if (isMultimodalEmbeddable(mimeType)) {
        console.log(`${logPrefix}: Multimodal ingestion (${mimeType})`);

        // Extract text content from the file
        let extractedText = "";
        try {
          extractedText = await extractFileContent(buffer, fileName, mimeType);
          console.log(
            `${logPrefix}: Extracted ${extractedText.length} chars via OpenAI input_file`
          );
        } catch (err) {
          console.warn(
            `${logPrefix}: Text extraction failed, falling back to visual-only embedding:`,
            err instanceof Error ? err.message : err
          );
        }

        // Prepend file metadata for type-aware embedding (BM25 strips this via <metadata> tags)
        const metadataPrefix = `<metadata>\nmime_type: ${mimeType}\nfile_name: ${fileName}\n</metadata>\n`;
        const textForEmbedding = extractedText
          ? `${metadataPrefix}${extractedText}`
          : metadataPrefix;

        // Aggregated embedding: metadata + text + raw bytes in single content entry
        const embedding = await geminiMultimodalEmbedding(
          buffer,
          mimeType,
          textForEmbedding
        );

        const content = `${metadataPrefix}${extractedText.trim() || `[Visual content of ${fileName}]`}`;

        const { error: insertError } = await supabase
          .from("document_embeddings")
          .insert({
            user_id: userId,
            document_id: documentId,
            content,
            embedding,
            metadata: {
              chunk_index: 0,
              file_name: fileName,
              embedding_type: extractedText ? "multimodal_aggregated" : "multimodal",
              length: buffer.length,
            },
          });

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Update the documents table with extracted text
        if (extractedText.trim()) {
          const contentHash = createHash("sha256").update(extractedText).digest("hex");
          await supabase
            .from("documents")
            .update({ text_content: extractedText, content_hash: contentHash })
            .eq("id", documentId);
        }

        console.timeEnd(timer);
        return { documentId, status: "processed", chunks: 1 };
      }

      // For text-based types, extract text then chunk + embed
      const extraction = await this.extractTextFromBuffer({
        buffer,
        mimeType,
        fileName,
      });

      if (!extraction.text?.trim()) {
        console.warn(`${logPrefix}: No text extracted, skipping embedding`);
        console.timeEnd(timer);
        return {
          documentId,
          status: "skipped",
          reason: "No text could be extracted",
        };
      }

      const chunks = this.chunkText(extraction.text);
      if (!chunks.length) {
        console.timeEnd(timer);
        return {
          documentId,
          status: "skipped",
          reason: "No chunks produced from extracted text",
        };
      }

      // Prepend file metadata to first chunk (BM25 strips this via <metadata> tags)
      chunks[0] = `<metadata>\nmime_type: ${mimeType}\nfile_name: ${fileName}\n</metadata>\n${chunks[0]}`;

      console.log(`${logPrefix}: Generating Gemini text embeddings for ${chunks.length} chunks`);
      const embeddings = await this.generateEmbeddings(chunks);

      const { error: insertError } = await supabase
        .from("document_embeddings")
        .insert(
          chunks.map((chunk, index) => ({
            user_id: userId,
            document_id: documentId,
            content: chunk,
            embedding: embeddings[index],
            metadata: {
              chunk_index: index,
              file_name: fileName,
              embedding_type: "text",
              length: chunk.length,
            },
          }))
        );

      if (insertError) {
        throw new Error(insertError.message);
      }

      console.timeEnd(timer);
      return { documentId, status: "processed", chunks: chunks.length };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Embedding failed";
      console.error(`${logPrefix}: Embedding failed:`, message);
      console.timeEnd(timer);
      return {
        documentId,
        status: "failed",
        reason: message,
      };
    }
  }
}

export const documentIngestionService = new DocumentIngestionService();
