"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmissionDialog } from "@/components/approval-request/SubmissionDialog";
import { useLanguage } from "@/providers/LanguageProvider";

interface RingiProposalButtonProps {
  proposal: Record<string, any>;
}

export function RingiProposalButton({ proposal }: RingiProposalButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const docCount = proposal.document_ids?.length || 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border-primary bg-primary/5 hover:bg-primary/10 font-medium"
      >
        <FileEdit className="w-4 h-4" />
        {t("chat.createDraft")}
      </Button>
      {docCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {docCount} {docCount === 1 ? "document" : "documents"} referenced
        </p>
      )}
      <SubmissionDialog
        open={open}
        onOpenChange={setOpen}
        prefillData={proposal}
        onSuccess={() => {
          setOpen(false);
          router.push("/");
        }}
      />
    </>
  );
}
