import { SupabaseClient } from "@supabase/supabase-js";
import { geminiTextEmbedding, TASK_TYPE } from "@/service/gemini/embedding";

interface SubmissionRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  vendor_name: string | null;
  category: string | null;
  department: string | null;
  purpose: string | null;
  reason_for_purchase: string | null;
  remarks: string | null;
  items: { name: string; quantity?: number; amount?: number }[] | null;
}

function buildSubmissionText(
  submission: SubmissionRow,
  submitterName: string | null
): string {
  const parts: string[] = [];

  if (submission.title) parts.push(`Title: ${submission.title}`);
  if (submission.vendor_name) parts.push(`Vendor: ${submission.vendor_name}`);
  if (submission.department) parts.push(`Department: ${submission.department}`);
  if (submission.category) parts.push(`Category: ${submission.category}`);
  if (submission.description)
    parts.push(`Description: ${submission.description}`);
  if (submission.purpose) parts.push(`Purpose: ${submission.purpose}`);
  if (submission.reason_for_purchase)
    parts.push(`Reason: ${submission.reason_for_purchase}`);
  if (submission.remarks) parts.push(`Remarks: ${submission.remarks}`);

  if (submission.items && submission.items.length > 0) {
    const itemNames = submission.items.map((item) => item.name).join(", ");
    parts.push(`Items: ${itemNames}`);
  }

  if (submitterName) parts.push(`Submitter: ${submitterName}`);

  return parts.join("\n");
}

export async function embedSubmission(
  supabase: SupabaseClient,
  approvalRequestId: string
): Promise<void> {
  // Fetch submission
  const { data: submission, error: fetchError } = await supabase
    .from("approval_requests")
    .select(
      "id, user_id, title, description, vendor_name, category, department, purpose, reason_for_purchase, remarks, items"
    )
    .eq("id", approvalRequestId)
    .single();

  if (fetchError || !submission) {
    console.error(
      `[Embedding] Failed to fetch submission ${approvalRequestId}:`,
      fetchError?.message
    );
    return;
  }

  // Fetch submitter name
  let submitterName: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", submission.user_id)
    .single();

  if (profile) {
    submitterName = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ");
  }

  const text = buildSubmissionText(submission as SubmissionRow, submitterName);

  if (!text.trim()) {
    console.warn(
      `[Embedding] Submission ${approvalRequestId} has no text to embed`
    );
    return;
  }

  // Generate embedding using Gemini
  const embedding = await geminiTextEmbedding(text, TASK_TYPE.RETRIEVAL_DOCUMENT);

  // Upsert into submission_embeddings
  const { error: upsertError } = await supabase
    .from("submission_embeddings")
    .upsert(
      {
        user_id: submission.user_id,
        approval_request_id: approvalRequestId,
        embedding: JSON.stringify(embedding),
        content: text,
      },
      { onConflict: "approval_request_id" }
    );

  if (upsertError) {
    console.error(
      `[Embedding] Failed to upsert submission embedding for ${approvalRequestId}:`,
      upsertError.message
    );
    return;
  }

  console.log(
    `[Embedding] Submission ${approvalRequestId} embedded (${text.length} chars)`
  );
}
