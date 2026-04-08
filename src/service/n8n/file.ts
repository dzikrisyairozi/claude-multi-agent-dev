import { IFileResponse, IUploadParams } from "@/types/file";
import { axiosClientN8N } from "../apiClient";
import { getWebhookN8NUrl } from "@/lib/constant";

export const uploadFiles = async ({
  files,
}: IUploadParams): Promise<IFileResponse[]> => {
  try {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axiosClientN8N.post(
      `/${getWebhookN8NUrl}/upload-file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const payload = Array.isArray(response.data)
      ? response.data[0]
      : response.data;

    return payload?.data?.files;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Error uploading files");
  }
};
