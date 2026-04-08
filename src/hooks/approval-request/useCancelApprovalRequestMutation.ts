import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteApprovalRequest } from "@/service/approvalRequest/approvalRequest";
import { useRouter } from "next/navigation";

export function useCancelApprovalRequestMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteApprovalRequest(id);
      if (error) {
        throw new Error(error);
      }
    },
    onSuccess: (_, id) => {
      toast.success("Request cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      router.refresh();

      // If we are on the detail page (path ends with ID), we should redirect.
      if (window.location.pathname.includes(id)) {
        router.push("/");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel request");
    },
  });
}
