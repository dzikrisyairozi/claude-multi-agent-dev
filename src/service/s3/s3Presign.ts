import { axiosNextServer } from "../apiClient";
import { IGetFileUrlRequest } from "@/types/file";

/**
 * Get AWS S3 presigned URL and upload file directly
 */
export const getPresignedUrl = async ({
  file_name,
}: IGetFileUrlRequest): Promise<{ url: string; key: string }> => {
  try {
    const response = await axiosNextServer.post("/presign", {
      fileName: file_name,
    });

    return response.data;
  } catch (error) {
    const err = error as { response?: { data?: { error?: string } } };
    throw new Error(
      err.response?.data?.error || "Failed to get presigned URL"
    );
  }
};
