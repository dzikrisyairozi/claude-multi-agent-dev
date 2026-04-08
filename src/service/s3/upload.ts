import { axiosNextServer } from "../apiClient";
import { UploadResponsePartial } from "@/types/document";

type UploadRequest = {
  files: File[];
  accessToken: string;
};

export const uploadToS3AndPersist = async ({
  files,
  accessToken,
}: UploadRequest): Promise<UploadResponsePartial> => {
  if (!files.length) {
    throw new Error("No files selected");
  }

  if (!accessToken) {
    throw new Error("Access token missing");
  }

  const formData = new FormData();
  files.forEach((file, index) => {
    const metadata = {
      mimeType: file.type || "",
      size: file.size,
    };

    formData.append("files", file);
    formData.append(`metadata_${index}`, JSON.stringify(metadata));
  });

  try {
    const response = await axiosNextServer.post("/upload", formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
      validateStatus: (status) => status === 200 || status === 207,
    });

    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    throw new Error(axiosError.response?.data?.error || "Upload failed");
  }
};
