import { useState, useCallback } from "react";
import { toast } from "sonner";
import { DocumentRecord } from "@/types/document";
import { useLanguage } from "@/providers/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";

type DownloadMode = "open" | "download";

export function useFileDownload() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const downloadFile = useCallback(
    async (file: DocumentRecord, mode: DownloadMode) => {
      setIsLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          toast.error(t("toast.sessionMissing"));
          return;
        }

        // file_path is stored as "uploads/{userId}/{timestamp}_{filename}"
        // presign API expects the path after "uploads/"
        const fileName = file.file_path.replace(/^uploads\//, "");

        const response = await fetch("/api/presign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            fileName,
            disposition: mode === "download" ? "attachment" : "inline",
            originalFileName: file.file_name,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get download URL");
        }

        const { url } = await response.json();

        if (mode === "open") {
          // Open in new tab
          window.open(url, "_blank");
        } else {
          // Trigger download
          const link = document.createElement("a");
          link.href = url;
          link.download = file.file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error("Download error:", error);
        toast.error(t("toast.downloadFailed"));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  return { downloadFile, isLoading };
}
