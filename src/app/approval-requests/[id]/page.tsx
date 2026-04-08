import { getApprovalRequest } from "@/service/approvalRequest/approvalRequest";
import { canUserApproveCurrentStep } from "@/service/approvalRequest/approvalRouteMatching";
import { IFileMetadata } from "@/types/file";
import { getUserRole } from "@/service/user";
import { supabaseServer } from "@/integrations/supabase/server";
import ApprovalRequestPageClient from "@/components/approval-request/ApprovalRequestPageClient";

export default async function ApprovalRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: request, error } = await getApprovalRequest(id);
  const userRole = await getUserRole();
  const isManagerOrPlatformAdmin =
    userRole === "admin" || userRole === "platform_admin";

  // Get current user to check ownership
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === request?.user_id;

  if (error || !request) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">
            {error || "Approval request not found"}
          </p>
        </div>
      </div>
    );
  }

  // Determine if user can approve the current step
  let canApprove = false;
  let currentStepName: string | null = null;
  let currentStepOrder: number | null = null;
  const totalSteps = request.step_approvals?.length || 0;

  if (request.route_id && user) {
    // Multi-step workflow: check step-level authorization
    const { canApprove: canApproveStep, currentStep } =
      await canUserApproveCurrentStep(id, user.id);
    canApprove = canApproveStep;
    currentStepName = currentStep?.step_name || null;
    currentStepOrder = currentStep?.step_order || null;
  } else {
    // Legacy flow: use role-based check
    canApprove = isManagerOrPlatformAdmin && request.status === "pending";
  }

  // Map attached documents to IFileMetadata for FileCard
  const attachedFiles: IFileMetadata[] = request.documents.map((doc) => ({
    id: doc.id,
    name: doc.documents?.file_name || "Unknown File",
    mimeType: doc.documents?.mime_type || "application/octet-stream",
    size: doc.documents?.file_size || 0,
    fileUrl: doc.documents?.file_name || "", // Assuming file_name is the path used for presigned URL
    modifiedTime: doc.created_at,
  }));

  return (
    <ApprovalRequestPageClient
      request={request}
      isOwner={isOwner}
      isManagerOrPlatformAdmin={isManagerOrPlatformAdmin}
      canApprove={canApprove}
      currentStepName={currentStepName}
      currentStepOrder={currentStepOrder}
      totalSteps={totalSteps}
      attachedFiles={attachedFiles}
      id={id}
    />
  );
}
