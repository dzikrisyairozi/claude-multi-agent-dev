"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, XCircle } from "lucide-react";
import { SubmissionDialog } from "@/components/approval-request/SubmissionDialog";
import { ApprovalRequest } from "@/types/approvalRequest";
import { CancelRequestDialog } from "@/components/approval-request/CancelRequestDialog";
import { useCancelApprovalRequestMutation } from "@/hooks/approval-request/useCancelApprovalRequestMutation";

interface ApprovalRequestOptionsProps {
  request: ApprovalRequest;
  isOwner: boolean;
}

export function ApprovalRequestOptions({
  request,
  isOwner,
}: ApprovalRequestOptionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const { mutate: cancelRequest, isPending: isCancelling } =
    useCancelApprovalRequestMutation();

  if (!isOwner) {
    return null;
  }

  const handleCancelRequest = async () => {
    cancelRequest(request.id, {
      onSuccess: () => setIsCancelDialogOpen(false),
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Request
          </DropdownMenuItem>
          {(request.status === "pending" || request.status === "draft") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsCancelDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                Cancel Request
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SubmissionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={request}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          window.location.reload();
        }}
      />

      <CancelRequestDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        requestTitle={request.title}
        onConfirm={handleCancelRequest}
        isLoading={isCancelling}
      />
    </>
  );
}
