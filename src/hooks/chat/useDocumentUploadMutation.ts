import { useMutation } from "@tanstack/react-query";
import { uploadToS3AndPersist } from "@/service/s3/upload";
import { DocumentRecord } from "@/types/document";

type UploadMutationOptions = {
  accessToken?: string;
  onSuccess?: (
    documents: DocumentRecord[],
    variables: { files: File[] }
  ) => Promise<void> | void;
  onError?: (error: Error) => void;
};

export function useDocumentUploadMutation(options: UploadMutationOptions) {
  return useMutation({
    mutationFn: ({ files }: { files: File[] }) =>
      uploadToS3AndPersist({
        files,
        accessToken: options.accessToken ?? "",
      }),
    onSuccess: async (result, variables) => {
      const documents = result.results
        .filter((r) => r.status === "success" && r.document)
        .map((r) => r.document!);
      await options.onSuccess?.(documents, variables);
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });
}
